import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import * as validator from "validator";
import { PrismaClient, User } from "../../client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDateFromNow, getEnvOrThrow } from "./helpers";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "../../client/runtime/library";

const prisma = new PrismaClient();

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
};

const isRegisterPayload = (obj: any): obj is RegisterPayload => {
  return (
    typeof (obj as RegisterPayload).username === "string" &&
    typeof (obj as RegisterPayload).email === "string" &&
    typeof (obj as RegisterPayload).password === "string" &&
    typeof (obj as RegisterPayload).confirm_password === "string"
  );
};
//check only if the email is an email,
//for username and email unique constraint I'll catch P2002 prisma error
const validateRegister = async (
  obj: RegisterPayload,
  req: Request
): Promise<Omit<User, "id" | "uuid" | "profile_picture" | "created_at">> => {
  if (
    obj.email.trim() === "" &&
    obj.username.trim() === "" &&
    obj.password.trim() === "" &&
    obj.confirm_password.trim() === ""
  ) {
    throw createHttpError(400, "Please  fill the inputs");
  }

  if (obj.username && obj.username.length < 3) {
    req.invalidField = "username";
    throw createHttpError(400, "Username must be at least 3 characters long");
  }

  if (!validator.isEmail(obj.email)) {
    req.invalidField = "email";
    throw createHttpError(400, "enter a valid email (ex: example@mail.com)");
  }
  if (obj.password !== obj.confirm_password) {
    req.invalidField = "password";
    throw createHttpError(400, "passwords are not equal");
  }

  if (!validator.isStrongPassword(obj.password)) {
    req.invalidField = "password";
    throw createHttpError(
      400,
      "Password must be at least of 8 characters with one lowercase, one uppercase, one number and one symbol"
    );
  }

  const { confirm_password, password, ...rest } = obj;

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = { ...rest, password: hashedPassword, deleted_at: null };

  return newUser;
};

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isRegisterPayload(req.body)) {
      throw createHttpError(400, "invalid request payload");
    }
    const registerPayload: RegisterPayload = req.body;
    const newUser = await validateRegister(registerPayload, req);

    await prisma.user.create({
      data: newUser,
    });

    res.status(200).json({
      success: true,
      message: "user registered successfully",
    });
  } catch (err: unknown) {
    //console.log(err);
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        if (err.meta?.target === "users_email_key") {
          req.invalidField = "email";
          throw createHttpError(409, "email already taken");
        }
        if (err.meta?.target === "users_username_key")
          req.invalidField = "username";
        throw createHttpError(409, "username already taken");
      }
    }
    if (err instanceof PrismaClientInitializationError) {
      throw createHttpError(500, "Internal server error");
    }

    next(err);
  }
};

type LoginPayload = { email: string; password: string };
const isLoginPayload = (obj: any): obj is LoginPayload => {
  if (obj) {
    return (
      typeof (obj as LoginPayload).email === "string" &&
      typeof (obj as LoginPayload).password === "string"
    );
  }
  return false;
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    //console.log(req.body);
    if (!isLoginPayload(req.body)) {
      throw createHttpError(400, "bad request");
    }

    const { email: userEmail, password: userPassword } = req.body;

    //validate the email
    if (userEmail !== null && !validator.isEmail(userEmail)) {
      req.invalidField = "email";
      throw createHttpError(400, "enter a valid email (ex: example@mail.com)");
    }

    if (userPassword.trim() === "") {
      req.invalidField = "password";
      throw createHttpError(400, "please fill the password input");
    }

    const authUser = await prisma.user.findFirstOrThrow({
      where: {
        email: userEmail,
        deleted_at: null,
      },
    });

    //check if password is correct
    const isPasswordCorrect = await bcrypt.compare(
      userPassword,
      authUser.password
    );

    if (!isPasswordCorrect) {
      throw createHttpError(401, "wrong credentials");
    }

    //generate a token and give it to the client
    const token = jwt.sign(
      { user_uuid: authUser.uuid },
      getEnvOrThrow("JWT_SECRET_KEY"),
      { expiresIn: 15 * 60 }
    );

    const refreshToken = jwt.sign(
      { user_uuid: authUser.uuid },
      getEnvOrThrow("JWT_SECRET_KEY"),
      { expiresIn: "7d" }
    );

    //set a cookie in the client browser with a longer expiration (refresh token)
    res.cookie("REFRESH_TOKEN", refreshToken, {
      expires: getDateFromNow(7),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });

    const { uuid, username, profile_picture } = authUser;

    res.status(200).json({
      success: true,
      token,
      authUser: { uuid, username, profile_picture },
    });
  } catch (err) {
    //console.log(err);
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        throw createHttpError(
          404,
          err.meta?.modelName.toLowerCase() + " " + "not found"
        );
      }
    }
    if (err instanceof PrismaClientInitializationError) {
      throw createHttpError(500, "Internal server error");
    }
    next(err);
  }
};

const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const refreshToken = req.cookies["REFRESH_TOKEN"]!;

    const decodedUser = jwt.verify(
      refreshToken,
      getEnvOrThrow("JWT_SECRET_KEY")
    );

    //todo if refresh token expires, logout the user

    if (typeof decodedUser === "object") {
      const tokenUser = await prisma.user.findUnique({
        where: {
          uuid: decodedUser.user_uuid,
        },
      });

      if (!tokenUser) {
        res.clearCookie("REFRESH_TOKEN", {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        });
        throw createHttpError(404, "user not found");
      }
      //if refresh token is verified, sign a new access token and serve it
      const refreshedAccessToken = jwt.sign(
        { user_uuid: decodedUser.user_uuid },
        getEnvOrThrow("JWT_SECRET_KEY"),
        { expiresIn: 15 * 60 }
      );

      const newRefreshToken = jwt.sign(
        { user_uuid: decodedUser.user_uuid },
        getEnvOrThrow("JWT_SECRET_KEY"),
        { expiresIn: "7d" }
      );

      res.cookie("REFRESH_TOKEN", newRefreshToken, {
        expires: getDateFromNow(7),
        httpOnly: true,
        sameSite: "none",
        secure: true,
      });

      res.status(200).json({
        success: true,
        token: refreshedAccessToken,
        message: "token refreshed",
      });
    }
  } catch (err) {
    throw createHttpError(401, "Unauthorized");
  }
};

const logout = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.clearCookie("REFRESH_TOKEN");
    res.status(200).json({
      success: true,
      message: "user logged out",
    });
  } catch (err) {
    next(err);
  }
};

export { register, login, refreshToken, logout };

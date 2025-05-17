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
    (obj as RegisterPayload).username.length !== 0 &&
    typeof (obj as RegisterPayload).email === "string" &&
    (obj as RegisterPayload).email.length !== 0 &&
    typeof (obj as RegisterPayload).password === "string" &&
    (obj as RegisterPayload).password.length !== 0 &&
    typeof (obj as RegisterPayload).confirm_password === "string" &&
    (obj as RegisterPayload).confirm_password.length !== 0
  );
};
//check only if the email is an email,
//for username and email unique constraint I'll catch P2002 prisma error
const validateRegister = async (
  obj: RegisterPayload
): Promise<Omit<User, "id" | "uuid" | "profile_picture" | "created_at">> => {
  if (!validator.isEmail(obj.email)) {
    throw createHttpError(400, "enter a valid email (ex: example@mail.com)");
  }
  if (obj.password !== obj.confirm_password) {
    throw createHttpError(400, "passwords are not equal");
  }

  //TODO: validate strongPassword using validator

  const { confirm_password, password, ...rest } = obj;

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = { ...rest, password: hashedPassword, deleted_at: null };

  return newUser;
};

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isRegisterPayload(req.body)) {
      throw createHttpError(400, "bad request");
    }
    const registerPayload: RegisterPayload = req.body;
    const newUser = await validateRegister(registerPayload);

    await prisma.user.create({
      data: newUser,
    });

    //TO POSSIBLY DO: give a token when register
    res.status(200).json({
      success: true,
      message: "user registered successfully",
    });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw createHttpError(409, "user already exists");
      }
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

    const authUser = await prisma.user.findFirstOrThrow({
      where: {
        email: userEmail,
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
      sameSite: "lax",
      //to uncomment for production
      /* secure: true, */
    });

    const { uuid, username, profile_picture } = authUser;

    res.status(200).json({
      success: true,
      token,
      authUser: { uuid, username, profile_picture },
    });
  } catch (err) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        throw createHttpError(
          404,
          err.meta?.modelName.toLowerCase() + " " + "not found"
        );
      }
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
        res.clearCookie("REFRESH_TOKEN");
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
        sameSite: "lax",
        /* secure: true, */
        //add samesite none and secure true when deploying
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

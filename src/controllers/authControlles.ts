import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import * as validator from "validator";
import { PrismaClient, User } from "../../client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getDateFromNow, getEnvOrThrow } from "./helpers";
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
  } catch (err: any) {
    if (err.code === "P2002") {
      throw createHttpError(409, "user already exists");
    }
    next(err);
  }
};

type LoginPayload =
  | { username: string; email: null; password: string }
  | { email: string; username: null; password: string };

const isLoginPayload = (obj: any): obj is LoginPayload => {
  //console.log(obj);
  //if one between username and email is a string is fine
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  if (typeof (obj as LoginPayload).password !== "string") {
    return false;
  }
  const hasEmail =
    typeof (obj as LoginPayload).email === "string" &&
    (obj as LoginPayload).email?.trim() !== "";
  const hasUsername =
    typeof (obj as LoginPayload).username === "string" &&
    (obj as LoginPayload).username?.trim() !== "";
  //console.log(hasEmail, hasUsername);

  return hasEmail !== hasUsername;
};

const findUserAtLogin = async (isEmail: boolean, emailOrUsername: string) => {
  //this helper will make a transaction after a check on email or username
  try {
    return await prisma.$transaction(async () => {
      const fieldName = isEmail ? "email" : "username";
      //console.log(fieldName, emailOrUsername);
      return await prisma.user.findFirstOrThrow({
        where: {
          [fieldName]: emailOrUsername,
        },
      });
    });
  } catch (err: any) {
    console.log(err);
    if (err.errorCode.startsWith("P10")) {
      throw createHttpError(500, "Internal Server Error");
    }

    throw createHttpError(401, "wrong credentials");
  }
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    //console.log(req.body);
    if (!isLoginPayload(req.body)) {
      throw createHttpError(400, "bad request");
    }

    const {
      email: userEmail,
      username: userUsername,
      password: userPassword,
    } = req.body;

    //validate the email
    if (userEmail !== null && !validator.isEmail(userEmail)) {
      req.invalidField = "email";
      throw createHttpError(400, "enter a valid email (ex: example@mail.com)");
    }

    const isEmail = userEmail !== null ? true : false;
    //console.log(isEmail);
    //in this case i know that if email is null then i get a username since I checked before
    //for both nullable values
    const emailOrUsername = userEmail !== null ? userEmail : userUsername!;
    //console.log(emailOrUsername);

    const authUser = await findUserAtLogin(isEmail, emailOrUsername);

    //check if password is correct
    const isPasswordCorrect = await bcrypt.compare(
      userPassword,
      authUser!.password
    );

    if (!isPasswordCorrect) {
      throw createHttpError(401, "wrong credentials");
    }

    //generate a token and give it to the client
    const token = jwt.sign(
      { user_uuid: authUser!.uuid },
      getEnvOrThrow("JWT_SECRET_KEY"),
      { expiresIn: 15 * 60 }
    );

    const refreshToken = jwt.sign(
      { user_uuid: authUser!.uuid },
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

    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    console.log(err);
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

import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import * as validator from "validator";
import { PrismaClient, User } from "../../client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();

type RegisterPayload = {
  username: string;
  email: string;
  password: string;
  confirm_password: string;
};

type LoginPayload = {
  username: string | null;
  email: string | null;
  password: string;
};

const isLoginPayload = (obj: any): obj is LoginPayload => {
  //if one between username and email is a string is fine
  return (
    (typeof (obj as LoginPayload).username === "string" ||
      typeof (obj as LoginPayload).email === "string") &&
    typeof (obj as LoginPayload).password === "string"
  );
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
const validateRegister = (
  obj: RegisterPayload
): Omit<User, "id" | "uuid" | "profile_picture" | "created_at"> => {
  if (!validator.isEmail(obj.email)) {
    throw createHttpError(400, "enter a valid email (ex: example@mail.com)");
  }
  if (obj.password !== obj.confirm_password) {
    throw createHttpError(400, "passwords are not equal");
  }

  //TODO: validate strongPassword using validator

  const { confirm_password, ...rest } = obj;
  const newUser = { ...rest, deleted_at: null };

  return newUser;
};

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isRegisterPayload(req.body)) {
      throw createHttpError(400, "bad request");
    }
    const registerPayload: RegisterPayload = req.body;
    const newUser = validateRegister(registerPayload);

    await prisma.user.create({
      data: newUser,
    });

    res.status(200).json({
      success: true,
      message: "user registered successfully",
    });
  } catch (err) {
    //TODO: catch P2002 error for unique contraints
    next(err);
  }
};

const findUserAtLogin = async (
  email: string | null,
  username: string | null
) => {
  //this helper will make a transaction after a check on email or username
  return prisma.$transaction(async () => {
    if (email !== null) {
      //this throw a P2001 (so I can catch it and throw a 404) or a user
      return await prisma.user.findUniqueOrThrow({
        where: {
          email: email,
        },
      });
    } else if (username !== null) {
      return await prisma.user.findUniqueOrThrow({
        where: {
          username: username,
        },
      });
    }
  });
};

const getEnvOrThrow = (name: string) => {
  if (!process.env[name]) {
    throw new Error("missing variable in .env file");
  }
  return process.env[name];
};

const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isLoginPayload(req.body)) {
      throw createHttpError(400, "bad request");
    }

    const loginPayload: LoginPayload = req.body;
    //validate the email
    if (loginPayload.email !== null && !validator.isEmail(loginPayload.email)) {
      throw createHttpError(400, "enter a valid email (ex: example@mail.com)");
    }

    const authUser = await findUserAtLogin(
      loginPayload.email,
      loginPayload.username
    );

    if (!authUser) {
      //this means the user gave me a wrong username or email
      throw createHttpError(400, "wrong credentials");
    }

    //check if password is correct
    const isPasswordCorrect = await bcrypt.compare(
      loginPayload.password,
      authUser.password
    );

    if (!isPasswordCorrect) {
      throw createHttpError(400, "wrong credentials");
    }

    //generate a token and give it to the client
    const token = jwt.sign(
      { user_uuid: authUser.uuid },
      getEnvOrThrow("JWT_SECRET_KEY"),
      { expiresIn: "30m" }
    );

    res.status(200).json({
      success: true,
      token,
    });
  } catch (err) {
    next(err);
  }
};

export { register, login };

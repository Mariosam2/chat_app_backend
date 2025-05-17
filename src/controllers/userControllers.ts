import { Request, Response, NextFunction } from "express";
import { validateUUIDS } from "./helpers";
import { PrismaClient, User } from "../../client";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import validator from "validator";
import { PrismaClientKnownRequestError } from "../../client/runtime/library";

const prisma = new PrismaClient();

const getLoggedInUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //console.log(req.user);
    if (!validateUUIDS(req.user)) {
      throw createHttpError(400, "bad request");
    }
    const authUserUUID = req.user;
    //get the user uuid from
    const authUser = await prisma.user.findUniqueOrThrow({
      where: {
        uuid: authUserUUID,
      },
      select: {
        uuid: true,
        username: true,
        profile_picture: true,
      },
    });
    res.status(200).json({
      success: true,
      authUser: authUser,
    });
  } catch (err: unknown) {
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

const getUserData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validateUUIDS(req.params?.userUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { userUUID } = req.params;

    const userData = await prisma.user.findUniqueOrThrow({
      where: {
        uuid: userUUID,
      },
      select: {
        username: true,
        profile_picture: true,
      },
    });

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        throw createHttpError(
          404,
          err.meta.modelName.toLowerCase() + " " + "not found"
        );
      }
    }
    next(err);
  }
};

const getChatUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateUUIDS(req.params?.chatUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { chatUUID } = req.params;

    const chatUsers = await prisma.chat.findUniqueOrThrow({
      where: {
        uuid: chatUUID,
      },
      select: {
        users: { select: { user_id: true } },
      },
    });

    const chatUsersIds = chatUsers.users.map((user) => user.user_id);

    const chatUsersData = await prisma.user.findMany({
      where: {
        id: { in: chatUsersIds },
      },
      select: {
        uuid: true,
      },
    });

    res.status(200).json({
      success: true,
      users: chatUsersData.map((user) => user.uuid),
    });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        throw createHttpError(
          404,
          err.meta.modelName.toLowerCase() + " " + "not found"
        );
      }
    }
    next(err);
  }
};

const getMessageUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateUUIDS(req.params?.messageUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { messageUUID } = req.params;

    const messageUsers = await prisma.message.findUniqueOrThrow({
      where: {
        uuid: messageUUID,
      },
      select: {
        sender: { select: { uuid: true } },
        receiver: { select: { uuid: true } },
      },
    });

    res.status(200).json({
      success: true,
      users: messageUsers,
    });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        throw createHttpError(
          404,
          err.meta.modelName.toLowerCase() + " " + "not found"
        );
      }
    }
    next(err);
  }
};

type EditableUser = {
  username: string;
  path: string;
  password: string;
  confirm_password: string;
};

const isEditableUser = (obj: any): obj is EditableUser => {
  return (
    (typeof (obj as EditableUser).username === "string" ||
      typeof (obj as EditableUser).username === null) &&
    typeof (obj as EditableUser).path === "string" &&
    typeof (obj as EditableUser).password === "string" &&
    typeof (obj as EditableUser).confirm_password === "string"
  );
};

type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;

const validateUpdateReq = (obj: EditableUser, req: Request) => {
  if (
    obj.username.trim() === "" &&
    obj.path.trim() === "" &&
    obj.password.trim() === "" &&
    obj.confirm_password.trim() === ""
  ) {
    req.invalidField = "all";
    throw createHttpError(400, "Change at least one field");
  }

  if (obj.password !== obj.confirm_password) {
    req.invalidField = "password";
    throw createHttpError(400, "passwords don't match");
  }

  if (obj.username && obj.username.length < 3) {
    req.invalidField = "username";
    throw createHttpError(400, "Username must be at least 3 characters long");
  }

  if (obj.password && !validator.isStrongPassword(obj.password)) {
    req.invalidField = "password";
    throw createHttpError(
      400,
      "Password must be at least of 8 characters with one lowercase, one uppercase, one number and one symbol"
    );
  }
};

const editUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    //console.log(req.file, req.body);
    if (!validateUUIDS(req.params?.userUUID)) {
      throw createHttpError(400, "Invalid user UUID");
    }

    if (!isEditableUser(req.body)) {
      throw createHttpError(400, "Invalid request body format");
    }

    validateUpdateReq(req.body, req);

    const { userUUID } = req.params;
    const { confirm_password, password, username, path, ...rest } = req.body;

    const editableUserData: Optional<
      Omit<User, "created_at" | "deleted_at" | "email" | "id" | "uuid">,
      "password" | "username" | "profile_picture"
    > = {
      ...rest,
    };

    if (username.trim() !== "") {
      editableUserData.username = username;
    }

    if (password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password.trim(), 10);
      editableUserData.password = hashedPassword;
    }
    //console.log(path.trim() !== "");
    if (path.trim() !== "") {
      editableUserData.profile_picture = "/uploads/" + path.trim();
    }

    console.log(editableUserData);

    const editedUser = await prisma.user.update({
      where: {
        uuid: userUUID,
      },
      data: editableUserData,
    });

    res.status(200).json({
      success: true,
      message: "user edited successfully",
      user: {
        uuid: editedUser?.uuid,
        username: editedUser.username,
        email: editedUser.email,
        profile_picture: editedUser.profile_picture,
      },
    });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        throw createHttpError(
          404,
          err.meta.modelName.toLowerCase() + " " + "not found"
        );
      }
      if (err.code === "P2002") {
        req.invalidField = "username";
        throw createHttpError(400, "Username is already taken");
      }
    }
    next(err);
  }
};

const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  //TODO: delete chat relations and messages relations
  try {
    if (!validateUUIDS(req.params?.userUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { userUUID } = req.params;

    await prisma.user.update({
      where: {
        uuid: userUUID,
      },
      data: { deleted_at: new Date() },
    });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        throw createHttpError(
          404,
          err.meta.modelName.toLowerCase() + " " + "not found"
        );
      }
    }
    next(err);
  }
};

export {
  getLoggedInUser,
  getUserData,
  getChatUsers,
  getMessageUsers,
  editUser,
  deleteUser,
};

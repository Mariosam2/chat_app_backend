import { Request, Response, NextFunction } from "express";
import { validateUUIDS } from "./helpers";
import { PrismaClient } from "../../client";
import createHttpError from "http-errors";

const prisma = new PrismaClient();

const getLoggedInUser = async () => {
  //get the user uuid from
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
  } catch (err: any) {
    if (err.code === "P2025") {
      throw createHttpError(
        404,
        err.meta.modelName.toLowerCase() + " " + "not found"
      );
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
  } catch (err: any) {
    if (err.code === "P2025") {
      throw createHttpError(
        404,
        err.meta.modelName.toLowerCase() + " " + "not found"
      );
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
  } catch (err: any) {
    if (err.code === "P2025") {
      throw createHttpError(
        404,
        err.meta.modelName.toLowerCase() + " " + "not found"
      );
    }
    next(err);
  }
};

type EditableUser = {
  username: string;
  profile_picture: string;
};

const isEditableUser = (obj: any): obj is EditableUser => {
  return (
    typeof (obj as EditableUser).username === "string" &&
    typeof (obj as EditableUser).profile_picture === "string"
  );
};

const editUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    //TODO: manage the edit of the profile picture with file system (multer)

    if (!validateUUIDS(req.params?.userUUID) || !isEditableUser(req.body)) {
      throw createHttpError(400, "bad request");
    }

    const { userUUID } = req.params;

    const editableUser: EditableUser = req.body;

    await prisma.user.update({
      where: {
        uuid: userUUID,
      },
      data: editableUser,
    });

    res.status(200).json({
      success: true,
      message: "user edited successfully",
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      throw createHttpError(
        404,
        err.meta.modelName.toLowerCase() + " " + "not found"
      );
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
  } catch (err: any) {
    if (err.code === "P2025") {
      throw createHttpError(
        404,
        err.meta.modelName.toLowerCase() + " " + "not found"
      );
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

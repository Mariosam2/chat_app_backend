import { Request, Response, NextFunction } from "express";
import { checkRequestData } from "./helpers";
import { PrismaClient } from "../../client";
import createHttpError from "http-errors";

const prisma = new PrismaClient();
//TODO: use validator to validate uuids and use P2001 for 404
const getUserData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userUUID } = req.params;

    if (!checkRequestData(userUUID)) {
      throw createHttpError(400, "bad request");
    }

    const userData = await prisma.user.findUnique({
      where: {
        uuid: userUUID,
      },
      select: {
        username: true,
        profile_picture: true,
      },
    });

    if (userData === null) {
      throw createHttpError(404, "not found");
    }

    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (err) {
    next(err);
  }
};

const getChatUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { chatUUID } = req.params;

    if (!checkRequestData(chatUUID)) {
      throw createHttpError(400, "bad request");
    }

    const chatUsers = await prisma.chat.findUnique({
      where: {
        uuid: chatUUID,
      },
      select: {
        users: { select: { user_id: true } },
      },
    });

    if (chatUsers === null) {
      throw createHttpError(404, "not found");
    }
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
  } catch (err) {
    next(err);
  }
};

const getMessageUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageUUID } = req.params;

    if (!checkRequestData(messageUUID)) {
      throw createHttpError(400, "bad request");
    }

    const messageUsers = await prisma.message.findUnique({
      where: {
        uuid: messageUUID,
      },
      select: {
        sender: { select: { uuid: true } },
        receiver: { select: { uuid: true } },
      },
    });

    if (messageUsers === null) {
      throw createHttpError(404, "not found");
    }

    res.status(200).json({
      success: true,
      users: messageUsers,
    });
  } catch (err) {
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
    const { userUUID } = req.params;
    if (!checkRequestData(userUUID) || !isEditableUser(req.body)) {
      throw createHttpError(400, "bad request");
    }

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
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  //TODO: delete chat relations and messages relations
  try {
    const { userUUID } = req.params;

    if (!checkRequestData(userUUID)) {
      throw createHttpError(400, "bad request");
    }

    await prisma.user.update({
      where: {
        uuid: userUUID,
      },
      data: { deleted_at: new Date() },
    });
  } catch (err) {
    next(err);
  }
};

export { getUserData, getChatUsers, getMessageUsers, editUser, deleteUser };

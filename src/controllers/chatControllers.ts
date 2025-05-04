import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import { PrismaClient } from "../prisma/client";

const prisma = new PrismaClient();

const getUserChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.params?.userUUId) {
      const httpError = createHttpError(400, "bad request");
      throw httpError;
    }

    const userChats = await prisma.user.findFirst({
      where: {
        uuid: req.params.userUUID,
      },
    });

    if (!userChats) {
      const httpError = createHttpError(404, "not found");
      throw httpError;
    }

    res.status(200).json({
      success: true,
      chats: userChats,
    });
  } catch (err) {
    next(err);
  }
};

const createChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body?.senderUUID || !req.body?.receiverUUID) {
      const httpError = createHttpError(400, "bad request");
      throw httpError;
    }

    //get sender and receiver
    const senderUUID = req.body.senderUUID;
    const receiverUUID = req.body.receiverUUID;

    const sender = await prisma.user.findFirst({
      where: {
        uuid: senderUUID,
      },
    });

    const receiver = await prisma.user.findFirst({
      where: {
        uuid: receiverUUID,
      },
    });

    if (!sender || !receiver) {
      const httpError = createHttpError(404, "not found");
      throw httpError;
    }

    //create the chat and make the relations to the user
    await prisma.chat.create({
      data: {
        created_at: new Date(),
        users: {
          //to check if these are created in userchat or user table, and check for chat_id
          create: [{ user_id: sender.id }, { user_id: receiver.id }],
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "chat created successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteForMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (
      !req.params?.chatToDisconnectUUID &&
      typeof req.params?.chatToDisconnectUUID !== "string" &&
      !req.params?.userToDisconnectUUID &&
      typeof req.params?.userToDisconnectUUID !== "string"
    ) {
      const httpError = createHttpError(400, "bad request");
      throw httpError;
    }

    const chatToDisconnectUUID = req.params.chatToDisconnectUUID;
    const userToDisconnectUUID = req.params.userToDisconnectUUID;

    const chatToDisconnect = await prisma.chat.findFirst({
      where: {
        uuid: chatToDisconnectUUID,
      },
    });

    const userToDisconnect = await prisma.user.findFirst({
      where: {
        uuid: userToDisconnectUUID,
      },
    });

    if (!chatToDisconnect || !userToDisconnect) {
      const httpError = createHttpError(404, "not found");
      throw httpError;
    }
    //drop the table in the userchat having this chat id and user id
    await prisma.userChat.delete({
      where: {
        user_id_chat_id: {
          user_id: userToDisconnect.id,
          chat_id: chatToDisconnect.id,
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "chat deleted for user only",
    });
  } catch (err) {
    next(err);
  }
};

const deleteForAll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.params?.chatUUID && typeof req.params?.chatUUID !== "string") {
      const httpError = createHttpError(400, "bad request");
      throw httpError;
    }
    const chatToDeleteUUID = req.params.chatUUID;

    const chatToDelete = await prisma.chat.findFirst({
      where: {
        uuid: chatToDeleteUUID,
      },
    });

    if (!chatToDelete) {
      const httpError = createHttpError(404, "not found");
      throw httpError;
    }
    await prisma.chat.delete({
      where: {
        id: chatToDelete.id,
      },
    });
    res.status(200).json({
      success: true,
      message: "chat deleted for all successfully",
    });
  } catch (err) {
    next(err);
  }
};

export { getUserChats, createChat, deleteForMe, deleteForAll };

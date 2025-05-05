import { Request, Response, NextFunction } from "express";
import { checkRequestData, checkAndFindMatches } from "./helpers";
import createHttpError from "http-errors";
import { PrismaClient } from "../prisma/client";

const prisma = new PrismaClient();
//TODO: refactoring see messagecontrollers
const getUserChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userUUID } = req.params;

    if (!checkRequestData(userUUID)) {
      throw createHttpError(400, "bad request");
    }
    const temp = await prisma.user.findUnique({
      where: {
        uuid: userUUID,
      },
      select: {
        chats: {
          select: {
            chat_id: true,
          },
        },
      },
    });

    if (temp !== null) {
      const userChatIds = temp.chats.map((chatIdObj) => chatIdObj.chat_id);
      const userChats = await prisma.chat.findMany({
        where: {
          id: { in: userChatIds },
        },
        select: {
          uuid: true,
        },
      });

      res.status(200).json({
        success: true,
        chats: userChats.map((userChat) => userChat.uuid),
      });
    } else {
      throw createHttpError(404, "not found");
    }
  } catch (err) {
    next(err);
  }
};

const createChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { senderUUID, receiverUUID } = req.body;

    if (!checkRequestData(senderUUID, receiverUUID)) {
      throw createHttpError(400, "bad request");
    }

    const sender = await prisma.user.findUnique({
      where: {
        uuid: senderUUID,
      },
      include: {
        chats: { select: { chat_id: true } },
      },
    });

    const receiver = await prisma.user.findUnique({
      where: {
        uuid: receiverUUID,
      },
      include: {
        chats: { select: { chat_id: true } },
      },
    });

    if (!sender || !receiver) {
      throw createHttpError(404, "not found");
    }

    const senderChatIds = sender.chats.map((chat) => chat.chat_id);
    const receiverChatIds = receiver.chats.map((chat) => chat.chat_id);

    const usersHaveChatAlready = checkAndFindMatches(
      senderChatIds,
      receiverChatIds
    )[0];

    const chatInCommonId = checkAndFindMatches(
      senderChatIds,
      receiverChatIds
    )[1];

    if (usersHaveChatAlready && chatInCommonId !== null) {
      //if the users have a chat already, return the chat uuid as a response
      const { uuid: chatInCommonUUID } = await prisma.chat.findUniqueOrThrow({
        where: {
          id: chatInCommonId,
        },
      });

      res.status(200).json({
        success: true,
        message: "users have a chat already",
        chat: chatInCommonUUID,
      });
    } else {
      //if users dont have a chat, create a new one
      await prisma.chat.create({
        data: {
          created_at: new Date(),
          users: {
            create: [{ user_id: sender.id }, { user_id: receiver.id }],
          },
        },
      });
      res.status(200).json({
        success: true,
        message: "chat created successfully",
      });
    }
  } catch (err) {
    next(err);
  }
};

const deleteForMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatUUID: chatToDisconnectUUID } = req.params;
    const { userUUID: userToDisconnectUUID } = req.params;

    if (checkRequestData(chatToDisconnectUUID, userToDisconnectUUID)) {
      throw createHttpError(400, "bad request");
    }

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
      throw createHttpError(404, "not found");
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
    const { chatUUID: chatToDeleteUUID } = req.params;

    if (checkRequestData(chatToDeleteUUID)) {
      throw createHttpError(400, "bad request");
    }

    const chatToDelete = await prisma.chat.findFirst({
      where: {
        uuid: chatToDeleteUUID,
      },
    });

    if (!chatToDelete) {
      throw createHttpError(404, "not found");
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

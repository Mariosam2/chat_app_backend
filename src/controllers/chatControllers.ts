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
    if (!req.params?.uuid) {
      const httpError = createHttpError(400, "bad request");
      throw httpError;
    }

    const userChats = await prisma.user.findFirst({
      where: {
        uuid: req.params.uuid,
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

const deleteChat = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      message: "delete chat",
    });
  } catch (err) {
    next(err);
  }
};

export { getUserChats, createChat, deleteChat };

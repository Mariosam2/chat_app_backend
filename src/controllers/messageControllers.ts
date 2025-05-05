import { Request, Response, NextFunction } from "express";
import { checkRequestData } from "./helpers";
import { Message, PrismaClient } from "../../client";
import createHttpError from "http-errors";

const prisma = new PrismaClient();
//TODO: use validator to validate uuids and use P2001 for 404
const getUserMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userUUID } = req.params;

    if (!checkRequestData(userUUID)) {
      throw createHttpError(400, "bad request");
    }

    const userMessages = await prisma.user.findFirst({
      where: {
        uuid: userUUID,
      },

      select: {
        sentMessages: {
          select: { uuid: true, content: true, created_at: true },
        },
        receivedMessages: {
          select: { uuid: true, content: true, created_at: true },
        },
      },
    });

    if (!userMessages) {
      throw createHttpError(404, "not found");
    }

    res.status(200).json({
      success: true,
      messages: userMessages,
    });
  } catch (err) {
    next(err);
  }
};

const getChatMessages = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { chatUUID } = req.params;

    if (!checkRequestData(chatUUID)) {
      throw createHttpError(400, "bad request");
    }

    const chatMessages = prisma.chat.findFirst({
      where: {
        uuid: chatUUID,
      },

      select: {
        messages: { select: { uuid: true, content: true, created_at: true } },
      },
    });

    if (!chatMessages) {
      throw createHttpError(404, "not found");
    }

    res.status(200).json({
      success: true,
      messages: chatMessages,
    });
  } catch (err) {
    next(err);
  }
};

interface messagePayload {
  chatUUID: string;
  senderUUID: string;
  receiverUUID: string;
  content: string;
}

const checkMessageCreation = async (payload: messagePayload) => {
  return prisma.$transaction(async () => {
    try {
      const messageChat = await prisma.chat.findUniqueOrThrow({
        where: {
          uuid: payload.chatUUID,
        },
      });

      const messageSender = await prisma.user.findUniqueOrThrow({
        where: {
          uuid: payload.senderUUID,
        },
      });

      const messageReceiver = await prisma.user.findUniqueOrThrow({
        where: {
          uuid: payload.receiverUUID,
        },
      });

      const newMessage: Omit<Message, "id" | "uuid" | "created_at"> = {
        content: payload.content,
        sender_id: messageSender.id,
        receiver_id: messageReceiver.id,
        chat_id: messageChat.id,
      };

      await prisma.message.create({
        data: newMessage,
      });

      return true;
    } catch (err) {
      return false;
    }
  });
};

const createMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //get chat uuid, sender uuid and receiver uuid from body
  const { chatUUID, senderUUID, receiverUUID, content } = req.body;

  if (!checkRequestData(chatUUID, senderUUID, receiverUUID, content)) {
    throw createHttpError(400, "bad request");
  }

  const payload = {
    chatUUID,
    senderUUID,
    receiverUUID,
    content,
  };

  const wasMessageCreated = await checkMessageCreation(payload);

  if (!wasMessageCreated) {
    throw createHttpError(424, "unprocessable content");
  }

  res.status(200).json({
    success: true,
    message: "message created successfully",
  });

  try {
  } catch (err) {
    next(err);
  }
};

type EditableMessage = {
  content: string;
};

//type check for req.body

const isEditableMessage = (obj: any): obj is EditableMessage => {
  return typeof (obj as EditableMessage).content === "string";
};

const editMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messageUUID: messageToEditUUID } = req.params;

    if (!checkRequestData(messageToEditUUID) || !isEditableMessage(req.body)) {
      throw createHttpError(400, "bad request");
    }

    const editableMessage: EditableMessage = req.body;

    await prisma.message.update({
      where: {
        uuid: messageToEditUUID,
      },
      data: editableMessage,
    });

    res.status(200).json({
      success: true,
      message: "message edited successfully",
    });
  } catch (err) {
    next(err);
  }
};

const deleteMessageForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    //to delete a message for user  we just remove sender_id
    const { messageUUID: messageToDisconnectUUID } = req.params;
    if (!checkRequestData(messageToDisconnectUUID)) {
      throw createHttpError(400, "bad request");
    }

    const messageToDisconnect = await prisma.message.update({
      where: {
        uuid: messageToDisconnectUUID,
      },
      data: {
        sender_id: null,
      },
    });

    if (!messageToDisconnect) {
      throw createHttpError(424, "unprocessable content");
    }

    res.status(200).json({
      success: true,
      message: "message deleted for user only",
    });
  } catch (err) {
    next(err);
  }
};

const deleteMessageForAll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { messageUUID: messageToDeleteUUID } = req.params;

    if (!checkRequestData(messageToDeleteUUID)) {
      throw createHttpError(400, "bad request");
    }

    const messageToDelete = await prisma.message.delete({
      where: {
        uuid: messageToDeleteUUID,
      },
    });

    if (!messageToDelete) {
      throw createHttpError(404, "not found");
    }

    res.status(200).json({
      success: true,
      message: "message deleted for all",
    });
  } catch (err) {
    next(err);
  }
};

export {
  getUserMessages,
  getChatMessages,
  createMessage,
  editMessage,
  deleteMessageForUser,
  deleteMessageForAll,
};

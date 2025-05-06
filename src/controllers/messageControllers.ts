import { Request, Response, NextFunction } from "express";
import { checkRequestData } from "./helpers";
import { Message, PrismaClient } from "../../client";
import createHttpError from "http-errors";
import { UUIDVersion } from "validator";
import { UUID } from "crypto";

const prisma = new PrismaClient();

const getUserMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!checkRequestData(req.params?.userUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { userUUID } = req.params;

    const userMessages = await prisma.user.findUniqueOrThrow({
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

    res.status(200).json({
      success: true,
      messages: userMessages,
    });
  } catch (err: any) {
    if (err.code === "P2025") {
      throw createHttpError(
        404,
        err.meta.modelName.toLowerCase() + " " + "not found"
      );
    }
    //console.log(err);
    next(err);
  }
};

const getChatMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!checkRequestData(req.params?.chatUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { chatUUID } = req.params;

    const chatMessages = await prisma.chat.findUniqueOrThrow({
      where: {
        uuid: chatUUID,
      },

      select: {
        messages: {
          select: {
            uuid: true,
            content: true,
            created_at: true,
            sender: { select: { uuid: true } },
            receiver: { select: { uuid: true } },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      messages: chatMessages,
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

type MessagePayload = {
  chatUUID: UUID;
  senderUUID: UUID;
  receiverUUID: UUID;
  content: string;
};

const checkMessageCreation = async (payload: MessagePayload) => {
  return prisma.$transaction(async () => {
    try {
      const messageChat = await prisma.chat.findUniqueOrThrow({
        where: {
          uuid: payload.chatUUID,
        },
        include: {
          users: true,
        },
      });

      const messageSender = await prisma.user.findUniqueOrThrow({
        where: {
          uuid: payload.senderUUID,
        },
        include: {
          chats: true,
        },
      });

      const messageReceiver = await prisma.user.findUniqueOrThrow({
        where: {
          uuid: payload.receiverUUID,
        },
        include: {
          chats: true,
        },
      });

      //check if sender and receiver are related to the chat

      const messageChatUserChats = await prisma.userChat.findMany({
        where: {
          chat_id: messageChat.id,
        },
      });

      const messageChatUsers = messageChatUserChats.map(
        (userChat) => userChat.user_id
      );

      if (
        !messageChatUsers.includes(messageSender.id) ||
        !messageChatUsers.includes(messageReceiver.id)
      ) {
        throw createHttpError(400, "users are not related to the chat");
      }

      const newMessage: Omit<Message, "id" | "uuid" | "created_at"> = {
        content: payload.content,
        sender_id: messageSender.id,
        receiver_id: messageReceiver.id,
        chat_id: messageChat.id,
      };

      await prisma.message.create({
        data: newMessage,
      });
    } catch (err: any) {
      if (err.status === 400) {
        throw err;
      }

      throw createHttpError(
        424,
        "an error occured during the message creation"
      );
    }
  });
};

const validateMessagePayload = (obj: any) => {
  //console.log(obj);
  if (
    !checkRequestData(
      (obj as MessagePayload).chatUUID,
      (obj as MessagePayload).senderUUID,
      (obj as MessagePayload).receiverUUID
    ) ||
    typeof (obj as MessagePayload).content !== "string"
  ) {
    return false;
  }

  return true;
};

const createMessage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  //get chat uuid, sender uuid and receiver uuid from body

  if (!validateMessagePayload(req.body)) {
    throw createHttpError(400, "bad request");
  }

  const { chatUUID, senderUUID, receiverUUID, content } = req.body;

  const messagePayload = {
    chatUUID,
    senderUUID,
    receiverUUID,
    content,
  };

  await checkMessageCreation(messagePayload);

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
const validateEditableMessage = (obj: any): obj is EditableMessage => {
  return typeof (obj as EditableMessage).content === "string";
};

const editMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (
      !checkRequestData(req.params?.messageUUID) ||
      !validateEditableMessage(req.body)
    ) {
      throw createHttpError(400, "bad request");
    }

    const { messageUUID: messageToEditUUID } = req.params;

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

type SenderOrReceiver = {
  isSender: boolean;
};

const checkIfUserIsSenderOrReceiver = async (
  messageUUID: string,
  userInfos: SenderOrReceiver
) => {
  return prisma.$transaction(async () => {
    try {
      const fieldToUpdate = userInfos.isSender ? "sender_id" : "receiver_id";
      const deletedMessage = await prisma.message.findUniqueOrThrow({
        where: {
          uuid: messageUUID,
        },
      });

      if (deletedMessage[fieldToUpdate] === null) {
        throw createHttpError(400, "message already deleted for this user");
      }

      await prisma.message.update({
        where: {
          uuid: messageUUID,
        },
        data: {
          [fieldToUpdate]: null,
        },
      });
    } catch (err: any) {
      if (err.status === 400) {
        throw err;
      }
      throw createHttpError(
        424,
        "an error occured during the message deletion"
      );
    }
  });
};

const validateSenderOrReceiver = (obj: any): obj is SenderOrReceiver => {
  return typeof (obj as SenderOrReceiver).isSender === "boolean";
};

const deleteMessageForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (
      !checkRequestData(req.params?.messageUUID, req.params?.userUUID) ||
      !validateSenderOrReceiver(req.body)
    ) {
      throw createHttpError(400, "bad request");
    }
    const { messageUUID: messageToDisconnectUUID } = req.params;
    //I need to check if the user sending the request is the sender or the receiver
    //of the message, and set to null accordingly
    //this informations is passed in the body of the request (type SenderOrReceiver)
    const userInfos = req.body;

    await checkIfUserIsSenderOrReceiver(messageToDisconnectUUID, userInfos);

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
    if (!checkRequestData(req.params?.messageUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { messageUUID: messageToDeleteUUID } = req.params;

    await prisma.message.delete({
      where: {
        uuid: messageToDeleteUUID,
      },
    });

    res.status(200).json({
      success: true,
      message: "message deleted for all",
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
  getUserMessages,
  getChatMessages,
  createMessage,
  editMessage,
  deleteMessageForUser,
  deleteMessageForAll,
};

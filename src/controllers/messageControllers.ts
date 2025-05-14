import { Request, Response, NextFunction } from "express";
import { validateUUIDS } from "./helpers";
import { Message, PrismaClient } from "../../client";
import createHttpError from "http-errors";
import { UUID } from "crypto";
import { PrismaClientKnownRequestError } from "../../client/runtime/library";
const prisma = new PrismaClient();

const getChatUserMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateUUIDS(req.params?.userUUID, req.params?.chatUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { userUUID, chatUUID } = req.params;

    const userMessages = await prisma.user.findFirstOrThrow({
      where: {
        uuid: userUUID,
      },

      select: {
        sentMessages: {
          where: {
            Chat: {
              uuid: chatUUID,
            },
          },
          select: {
            uuid: true,
            content: true,
            created_at: true,
          },
        },
        receivedMessages: {
          where: {
            Chat: {
              uuid: chatUUID,
            },
          },
          select: {
            uuid: true,
            content: true,
            created_at: true,
          },
        },
      },
    });

    const { sentMessages, receivedMessages } = userMessages;
    // add a status for the client to style the sent and received message + sort by date
    const allMessages = sentMessages
      .map((sent) => {
        return { ...sent, status: "sent" };
      })
      .concat(
        receivedMessages.map((received) => {
          return { ...received, status: "received" };
        })
      )
      .sort((a, b) => {
        if (a.created_at > b.created_at) {
          return 1;
        } else if (a.created_at < b.created_at) {
          return -1;
        }
        return 0;
      });
    res.status(200).json({
      success: true,
      messages: allMessages,
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

const getChatMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateUUIDS(req.params?.chatUUID)) {
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
    } catch (err: unknown) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
          throw createHttpError(
            404,
            err.meta?.modelName.toLowerCase() + " " + "not found"
          );
        }
      } else if (createHttpError.isHttpError(err)) {
        if (err.statusCode === 400) {
          throw err;
        }
      } else {
        throw createHttpError(
          424,
          "an error occured during the message creation"
        );
      }
    }
  });
};

const validateMessagePayload = (obj: any) => {
  //console.log(obj);
  if (
    !validateUUIDS(
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
      !validateUUIDS(req.params?.messageUUID) ||
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

const checkIfUserIsSenderOrReceiver = async (
  messageUUID: string,
  wasMessageSent: boolean
) => {
  return prisma.$transaction(async () => {
    try {
      const fieldToUpdate = wasMessageSent ? "sender_id" : "receiver_id";
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
    } catch (err: unknown) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
          throw createHttpError(
            404,
            err.meta?.modelName.toLowerCase() + " " + "not found"
          );
        }
      } else if (createHttpError.isHttpError(err)) {
        if (err.statusCode === 400) {
          throw err;
        }
      } else {
        throw createHttpError(
          424,
          "an error occured during the message deletion"
        );
      }
    }
  });
};

const deleteMessageForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (
      !validateUUIDS(req.params?.messageUUID, req.params?.userUUID) ||
      !req.query["sent"] ||
      typeof (req.query["sent"] === "true") !== "boolean"
    ) {
      throw createHttpError(400, "bad request");
    }
    const { messageUUID: messageToDisconnectUUID } = req.params;
    //I need to check if the user sending the request is the sender or the receiver
    //of the message, and set to null accordingly
    //this informations is passed in the body of the request (type SenderOrReceiver)
    const wasMessageSent = req.query["sent"] === "true";

    await checkIfUserIsSenderOrReceiver(
      messageToDisconnectUUID,
      wasMessageSent
    );

    res.status(200).json({
      success: true,
      message: "message deleted for user only",
      message_uuid: messageToDisconnectUUID,
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
    if (!validateUUIDS(req.params?.messageUUID)) {
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
      message_uuid: messageToDeleteUUID,
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

export {
  getChatUserMessages,
  getChatMessages,
  createMessage,
  editMessage,
  deleteMessageForUser,
  deleteMessageForAll,
};

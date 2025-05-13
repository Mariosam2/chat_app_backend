import { Request, Response, NextFunction } from "express";
import { validateUUIDS, checkAndFindMatches } from "./helpers";
import createHttpError from "http-errors";
import { PrismaClient } from "../../client";
import { PrismaClientKnownRequestError } from "../../client/runtime/library";

const prisma = new PrismaClient();

const getUserChats = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateUUIDS(req.params?.userUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { userUUID } = req.params;

    const userUserChats = await prisma.user.findUniqueOrThrow({
      where: {
        uuid: userUUID,
      },
      select: {
        chats: {
          select: {
            chat_id: true,
          },
          where: {
            deleted_at: null,
          },
        },
      },
    });

    const userChatIDS = userUserChats.chats.map(
      (chatIdObj) => chatIdObj.chat_id
    );

    const userChats = await prisma.chat.findMany({
      where: {
        id: { in: userChatIDS },
      },
      select: {
        uuid: true,
        created_at: true,
        users: {
          where: { NOT: { user: { uuid: userUUID } } },
          select: {
            user: {
              select: { uuid: true, username: true, profile_picture: true },
            },
          },
        },
        messages: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: { uuid: true, content: true, created_at: true },
        },
      },
    });

    const cleanUserChat = userChats.map((userChat) => {
      const { users, messages, ...rest } = userChat;
      const [lastMessage] = messages;
      const [receiver] = users.map((el) => el.user);

      return {
        ...rest,
        lastMessage,
        receiver,
      };
    });

    res.status(200).json({
      success: true,
      chats: cleanUserChat,
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

const createChat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!validateUUIDS(req.body?.senderUUID, req.body?.receiverUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { senderUUID, receiverUUID } = req.body;

    const sender = await prisma.user.findUniqueOrThrow({
      where: {
        uuid: senderUUID,
      },
      include: {
        chats: { select: { chat_id: true } },
      },
    });

    const receiver = await prisma.user.findUniqueOrThrow({
      where: {
        uuid: receiverUUID,
      },
      include: {
        chats: { select: { chat_id: true } },
      },
    });

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
      const chatInCommon = await prisma.chat.findUniqueOrThrow({
        where: {
          id: chatInCommonId,
        },
        select: {
          uuid: true,
        },
      });

      res.status(400).json({
        success: false,
        message: "users have a chat already",
        chat: chatInCommon.uuid,
      });
    }

    //if users dont have a chat, create a new one with users relation
    const newChat = await prisma.chat.create({
      data: {
        users: {
          create: [{ user_id: sender.id }, { user_id: receiver.id }],
        },
      },
      select: {
        uuid: true,
        created_at: true,
        users: {
          where: {
            user: {
              id: receiver.id,
            },
          },
          select: {
            user: {
              select: {
                uuid: true,
                username: true,
                profile_picture: true,
              },
            },
          },
        },
      },
    });

    const { users, ...rest } = newChat;

    const newChatReceiver = users.map((user) => {
      return user.user;
    })[0];

    res.status(200).json({
      success: true,
      message: "chat created successfully",
      chat: { ...rest, lastMessage: null, receiver: newChatReceiver },
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

const deleteChatForUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateUUIDS(req.params?.chatUUID, req.params?.userUUID)) {
      //console.log(req.params);
      throw createHttpError(400, "bad request");
    }

    const { chatUUID: chatToDisconnectUUID } = req.params;
    const { userUUID: userToDisconnectUUID } = req.params;

    const chatToDisconnect = await prisma.chat.findUniqueOrThrow({
      where: {
        uuid: chatToDisconnectUUID,
      },
    });

    const userToDisconnect = await prisma.user.findUniqueOrThrow({
      where: {
        uuid: userToDisconnectUUID,
      },
    });

    //check if they are related first

    await prisma.userChat.findUniqueOrThrow({
      where: {
        user_id_chat_id: {
          user_id: userToDisconnect.id,
          chat_id: chatToDisconnect.id,
        },
      },
    });

    //drop the table in the userchat having this chat id and user id
    await prisma.userChat.update({
      where: {
        user_id_chat_id: {
          user_id: userToDisconnect.id,
          chat_id: chatToDisconnect.id,
        },
      },
      data: {
        deleted_at: new Date(Date.now()),
      },
    });

    res.status(200).json({
      success: true,
      message: "chat deleted for user only",
      chat: chatToDisconnect.uuid,
    });
  } catch (err: unknown) {
    if (err instanceof PrismaClientKnownRequestError) {
      if (err.code === "P2025" && typeof err.meta?.modelName === "string") {
        if (err.meta.modelName === "UserChat") {
          throw createHttpError(404, "this user doesn't have this chat");
        }
        throw createHttpError(
          404,
          err.meta.modelName.toLowerCase() + " " + "not found"
        );
      }
    }

    next(err);
  }
};

const deleteChatForAll = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!validateUUIDS(req.params?.chatUUID)) {
      throw createHttpError(400, "bad request");
    }

    const { chatUUID: chatToDeleteUUID } = req.params;

    const deletedChat = await prisma.chat.delete({
      where: {
        uuid: chatToDeleteUUID,
      },
    });

    //drop the relation manually since prisma onCascade not working
    await prisma.userChat.deleteMany({
      where: {
        chat_id: deletedChat.id,
      },
    });

    res.status(200).json({
      success: true,
      message: "chat deleted for all successfully",
      chat: deletedChat.uuid,
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

export { getUserChats, createChat, deleteChatForUser, deleteChatForAll };

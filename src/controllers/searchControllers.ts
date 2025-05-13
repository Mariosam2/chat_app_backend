import { Request, Response, NextFunction } from "express";
import { PrismaClient, Message } from "../../client";
import { validateUUIDS } from "./helpers";
import createHttpError from "http-errors";

const prisma = new PrismaClient();

const search = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (
      !validateUUIDS(req.params?.userUUID) &&
      typeof req.query?.query !== "string"
    ) {
      throw createHttpError(400, "bad request");
    }
    const userUUID = req.params?.userUUID;
    //console.log(userUUID);

    const query = req.query?.query?.toString();
    const userChats = await prisma.chat.findMany({
      where: {
        users: {
          some: {
            user: {
              uuid: userUUID,
            },
          },
        },
      },
      select: {
        id: true,
      },
    });

    const userChatIDS = userChats.map((chat) => chat.id);

    const messages = await prisma.message.findMany({
      where: {
        content: { contains: query },
        chat_id: {
          in: userChatIDS,
        },
        NOT: { sender: null },
      },

      select: {
        uuid: true,
        content: true,
        Chat: {
          select: {
            uuid: true,
          },
        },
        receiver: {
          select: {
            uuid: true,
            username: true,
            profile_picture: true,
          },
        },
        sender: {
          select: {
            uuid: true,
            username: true,
            profile_picture: true,
          },
        },
      },
    });

    interface SearchedMessage extends Message {
      user: {
        uuid: string;
        username: string;
        profile_picture: string;
      };
      chat: {
        uuid: string;
      };
    }

    let previousChatUUID: string = "";
    let cleanMessages: Omit<
      SearchedMessage,
      "id" | "created_at" | "chat_id" | "sender_id" | "receiver_id"
    >[] = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const { sender, receiver, Chat, ...rest } = message;
      if (Chat.uuid !== previousChatUUID) {
        previousChatUUID = Chat.uuid;
        if (receiver && receiver?.uuid !== userUUID) {
          cleanMessages.push({ ...rest, user: receiver, chat: Chat });
        } else if (sender) {
          cleanMessages.push({ ...rest, user: sender, chat: Chat });
        }
      }
    }

    const users = await prisma.user.findMany({
      where: {
        username: { contains: query },
        NOT: {
          uuid: userUUID,
        },
      },
      select: {
        uuid: true,
        username: true,
        profile_picture: true,
      },
    });

    res.status(200).json({
      success: true,
      results: {
        users,
        messages: cleanMessages,
      },
    });
  } catch (err) {
    next(err);
  }
};

export { search };

import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "../../client";
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
      take: 1,
      select: {
        content: true,
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

    const cleanMessages = messages.map((message) => {
      const { sender, receiver, ...rest } = message;
      if (sender?.uuid === userUUID) {
        return { ...rest, user: receiver };
      }
      return { ...rest, user: sender };
    });

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

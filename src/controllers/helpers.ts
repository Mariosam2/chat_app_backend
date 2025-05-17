import validator from "validator";
import "express";
import { PrismaClient } from "../../client";

const prisma = new PrismaClient();

declare module "express" {
  interface Request {
    user?: any;
    invalidField?: string;
  }
}

export const getEnvOrThrow = (name: string) => {
  if (!process.env[name]) {
    throw new Error("missing variable in .env file");
  }
  return process.env[name];
};

export const validateUUIDS = (...uuids: any[]) => {
  for (let i = 0; i < uuids.length; i++) {
    if (!uuids[i] || !validator.isUUID(uuids[i], 4)) {
      return false;
    }

    return true;
  }
};

export const checkAndFindMatches = (
  senderChatIds: bigint[],
  receiverChatIds: bigint[]
): [boolean, bigint | null] => {
  for (let i = 0; i < senderChatIds.length; i++) {
    const chatId = senderChatIds[i];
    if (receiverChatIds.includes(chatId)) {
      return [true, chatId];
    }
  }

  return [false, null];
};

export const getDateFromNow = (days: number) => {
  const now = new Date(Date.now());
  const addDays = now.getDate() + days;
  now.setDate(addDays);
  return now;
};

export const checkIfUserHasMessage = async (
  authUser: string,
  message: string,
  status: string
) => {
  const authUserMessages = await prisma.user.findUnique({
    where: {
      uuid: authUser,
    },
    select: {
      sentMessages: {
        where: {
          uuid: message,
        },
      },
      receivedMessages: {
        where: {
          uuid: message,
        },
      },
    },
  });

  /*  console.log(authUserMessages); */

  const messageFound = authUserMessages?.sentMessages.find(
    (sentMessage) => sentMessage.uuid === message
  );

  return messageFound;
};

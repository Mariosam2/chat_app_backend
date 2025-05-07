import validator from "validator";
import "express";

declare module "express" {
  interface Request {
    user?: any;
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

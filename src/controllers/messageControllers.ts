import { Request, Response, NextFunction } from "express";

import { PrismaClient } from "../prisma/client";

const prisma = new PrismaClient();

const getChatMessages = (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (err) {
    next(err);
  }
};

const createMessage = (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (err) {
    next(err);
  }
};

const editMessage = (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (err) {
    next(err);
  }
};

const deleteMessageForUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
  } catch (err) {
    next(err);
  }
};

const deleteMessage = (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (err) {
    next(err);
  }
};

export {
  getChatMessages,
  createMessage,
  editMessage,
  deleteMessageForUser,
  deleteMessage,
};

import { Request, Response, NextFunction } from "express";

import { PrismaClient } from "../prisma/client";

const prisma = new PrismaClient();

const getUserChats = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      message: "get user chats",
    });
  } catch (err) {
    next(err);
  }
};

const createChat = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      message: "create chat",
    });
  } catch (err) {
    next(err);
  }
};

const editChat = (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      message: "update chat",
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

export { getUserChats, createChat, editChat, deleteChat };

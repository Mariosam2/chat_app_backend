import { Request, Response, NextFunction } from "express";

const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (err) {
    next(err);
  }
};
const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
  } catch (err) {
    next(err);
  }
};

export { register, login };

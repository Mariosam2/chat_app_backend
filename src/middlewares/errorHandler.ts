import { Response, Request, NextFunction } from "express";

export interface AppError extends Error {
  status?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
};

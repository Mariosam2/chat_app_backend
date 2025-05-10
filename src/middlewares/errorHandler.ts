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
  const invalidField = req.invalidField;
  res.status(err.status || 500).json({
    success: false,
    invalidField,
    message: err.message || "Internal Server Error",
  });
};

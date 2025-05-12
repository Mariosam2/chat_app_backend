import { Response, Request, NextFunction } from "express";
import { MulterError } from "multer";

export interface AppError extends Error {
  status?: number;
}

const isAppError = (obj: unknown): obj is AppError => {
  return typeof (obj as AppError).status === "number";
};

export const errorHandler = (
  err: AppError | MulterError | Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof MulterError) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
  } else if (isAppError(err)) {
    const invalidField = req.invalidField;
    res.status(err.status || 500).json({
      success: false,
      invalidField,
      message: err.message || "Internal Server Error",
    });
  } else {
    res.status(400).json({
      success: false,
      invalidField: "profile_picture",
      message: err.message,
    });
  }
};

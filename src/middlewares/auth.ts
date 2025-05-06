import { Response, Request, NextFunction } from "express";
import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { getEnvOrThrow } from "../controllers/helpers";

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.header("JWT_BEARER")) {
      throw createHttpError(401, "Unauthorized");
    }
    const accessToken = req.header("JWT_BEARER")!;
    const isTokenValid = jwt.verify(
      accessToken,
      getEnvOrThrow("JWT_SECRET_KEY")
    );
    if (!isTokenValid) {
      throw createHttpError(401, "Unauthorized");
    }
    //refresh token system
    next(req);
  } catch (err) {
    throw err;
  }
};

import { Request, Response, NextFunction } from "express";

import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { getEnvOrThrow } from "../controllers/helpers";

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    //console.log(req);

    if (!req.header("JWT_BEARER")) {
      throw createHttpError(401, "Unauthorized");
    }

    const accessToken = req.header("JWT_BEARER")!;

    jwt.verify(accessToken, getEnvOrThrow("JWT_SECRET_KEY"), (err, decoded) => {
      if (err) {
        res.redirect("/api/auth/refresh-token");
      } else if (decoded && typeof decoded === "object") {
        req.user = decoded.user_uuid;
        next();
      }
    });
  } catch (err) {
    next(err);
  }
};

import { Request, Response, NextFunction } from "express";

import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { getEnvOrThrow } from "../controllers/helpers";

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    //console.log(req.header("Authorization"));
    if (!req.header("Authorization")) {
      throw createHttpError(401, "Unauthorized");
    }

    const accessToken = req.header("Authorization")?.split(" ")[1]!;

    const decodedUser = jwt.verify(
      accessToken,
      getEnvOrThrow("JWT_SECRET_KEY")
    );
    //console.log(decodedUser);
    if (typeof decodedUser !== "string") {
      req.user = decodedUser.user_uuid;
      next();
    }
  } catch (err) {
    next(err);
  }
};

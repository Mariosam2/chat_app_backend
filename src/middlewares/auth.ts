import { Request, Response, NextFunction } from "express";

import createHttpError from "http-errors";
import jwt from "jsonwebtoken";
import { getEnvOrThrow } from "../controllers/helpers";

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const accessToken = req.header("JWT_BEARER")!;
    //isTokenValid doesnt store a boolean, to fix: catch the error
    const decodedUser = jwt.verify(
      accessToken,
      getEnvOrThrow("JWT_SECRET_KEY")
    );

    //console.log(decodedUser);
    if (typeof decodedUser !== "string") {
      req.user = decodedUser.user_uuid;
    }

    //refresh token system
    next();
  } catch (err) {
    throw createHttpError(401, "Unauthorized");
  }
};

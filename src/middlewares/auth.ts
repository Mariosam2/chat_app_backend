import { Request, Response, NextFunction } from "express";

import createHttpError from "http-errors";
import jwt, { JwtPayload, VerifyCallback, VerifyErrors } from "jsonwebtoken";
import { getEnvOrThrow } from "../controllers/helpers";

interface MyCustomPayload extends JwtPayload {
  user_uuid: string;
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    //console.log(req.header("Authorization"));
    if (!req.header("Authorization")) {
      throw createHttpError(401, "Unauthorized");
    }

    const accessToken = req.header("Authorization")?.split(" ")[1]!;

    jwt.verify(accessToken, getEnvOrThrow("JWT_SECRET_KEY"), (err, decoded) => {
      if (err) {
        throw createHttpError(401, "Unauthorized");
      } else {
        req.user = (decoded as MyCustomPayload).user_uuid;
        next();
      }
    });
    //console.log(decodedUser);
  } catch (err) {
    next(err);
  }
};

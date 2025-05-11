import { Router } from "express";
import multer from "multer";
import {
  getUserData,
  getChatUsers,
  getMessageUsers,
  deleteUser,
  getLoggedInUser,
} from "../controllers/userControllers";

const router = Router();

router.get("/auth/logged-in", getLoggedInUser);
router.get("/user/:userUUID", getUserData);

router.get("/chat/:chatUUID", getChatUsers);

router.get("/message/:messageUUID", getMessageUsers);

router.delete("/:userUUID", deleteUser);

export default router;

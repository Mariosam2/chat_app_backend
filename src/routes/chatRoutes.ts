import { Router } from "express";
import {
  getUserChats,
  createChat,
  deleteChatForUser,
  deleteChatForAll,
} from "../controllers/chatControllers";
const router = Router();

router.get("/:userUUID", getUserChats);
//the creation will be done with a sender(user) a receiver(user) and a message,
//handled using request body
router.post("/", createChat);
//delete the table in userchat to delete only for user
router.delete("/:chatUUID/:userUUID", deleteChatForUser);
router.delete("/:chatUUID", deleteChatForAll);

export default router;

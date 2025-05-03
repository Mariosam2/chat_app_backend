import { Router } from "express";
import {
  getUserChats,
  createChat,
  editChat,
  deleteChat,
} from "../controllers/chatControllers";
const router = Router();

router.get("/:username", getUserChats);
//the creation will be done with a sender(user) a receiver(user) and a message,
//handled using request body
router.post("/", createChat);
//we can use the update for "delete only for me" feature or if we delete messages
router.put("/:chatId", editChat);
router.delete("/:chatId", deleteChat);

export default router;

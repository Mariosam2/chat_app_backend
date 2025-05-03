import { Router } from "express";
import {
  getChatMessages,
  createMessage,
  editMessage,
  deleteMessageForUser,
  deleteMessage,
} from "../controllers/messageControllers";
const router = Router();

router.get("/:chatId", getChatMessages);
//save the message in a chat sent via body of the request
router.post("/", createMessage);

router.put("/:messageId", editMessage);
//set to null the foreign key to drop the relation (User one-to-many Messages)
router.put("/:messageId", deleteMessageForUser);

router.delete("/:messageId", deleteMessage);

export default router;

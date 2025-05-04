import { Router } from "express";
import {
  getUserMessages,
  getChatMessages,
  createMessage,
  editMessage,
  deleteMessageForUser,
  deleteMessageForAll,
} from "../controllers/messageControllers";
const router = Router();

router.get("/:messageUUID", getUserMessages);
router.get("/:chatUUID", getChatMessages);
//save the message in a chat sent via body of the request
router.post("/", createMessage);

router.put("/:messageId", editMessage);
//set to null the foreign key to drop the relation (User one-to-many Messages)
router.put("/:messageId", deleteMessageForUser);

router.delete("/:messageId", deleteMessageForAll);

export default router;

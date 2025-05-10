import { Router } from "express";
import {
  getChatUserMessages,
  getChatMessages,
  createMessage,
  editMessage,
  deleteMessageForUser,
  deleteMessageForAll,
} from "../controllers/messageControllers";
const router = Router();

router.get("/user/:userUUID/:chatUUID", getChatUserMessages);
router.get("/chat/:chatUUID", getChatMessages);
//save the message in a chat sent via body of the request
router.post("/", createMessage);

router.put("/:messageUUID", editMessage);
//set to null the foreign key to drop the relation (User one-to-many Messages)
router.delete("/delete-for-user/:messageUUID/", deleteMessageForUser);

router.delete("/delete-for-all/:messageUUID", deleteMessageForAll);

export default router;

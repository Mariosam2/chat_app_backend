import { Router } from "express";
import {
  getUserData,
  getChatUsers,
  getMessageUsers,
  editUser,
  deleteUser,
} from "../controllers/userControllers";

const router = Router();

router.get("/:userUUID", getUserData);

router.get("/:chatUUID", getChatUsers);

router.get("/:messageUUID", getMessageUsers);

router.put("/:userUUID", editUser);

router.delete("/:userUUID", deleteUser);

export default router;

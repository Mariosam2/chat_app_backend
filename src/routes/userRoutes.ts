import { Router } from "express";
import {
  getUserData,
  register,
  login,
  editUser,
  deleteUser,
} from "../controllers/userControllers";

const router = Router();

router.get("/:userUUID", getUserData);

router.post("/register", register);

router.post("/login", login);

router.put("/:userUUID", editUser);

router.delete("/:userUUID", deleteUser);

export default router;

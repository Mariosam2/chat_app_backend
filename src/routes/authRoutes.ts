import { Router } from "express";
import {
  register,
  login,
  refreshToken,
  logout,
} from "../controllers/authControlles";

const router = Router();

router.get("/refresh-token", refreshToken);

router.post("/register", register);

router.post("/logout", logout);

router.post("/login", login);

export default router;

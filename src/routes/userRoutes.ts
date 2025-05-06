import { Router } from "express";
import multer from "multer";
const upload = multer({ dest: "../../public/images/uploads" });
import {
  getUserData,
  getChatUsers,
  getMessageUsers,
  editUser,
  deleteUser,
} from "../controllers/userControllers";

const router = Router();

router.get("/user/:userUUID", getUserData);

router.get("/chat/:chatUUID", getChatUsers);

router.get("/message/:messageUUID", getMessageUsers);
//upload.single("profile_picture") add to editUser route
router.put("/:userUUID", editUser);

router.delete("/:userUUID", deleteUser);

export default router;

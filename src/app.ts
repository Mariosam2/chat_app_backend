import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import { auth } from "./middlewares/auth";
import cookieParser from "cookie-parser";
import cors from "cors";
import multer from "multer";
import { editUser } from "./controllers/userControllers";
import { search } from "./controllers/searchControllers";
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/images/");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

const whitelist = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const maxSize = 5000000;

export const upload = multer({
  storage: storage,
  limits: { fileSize: maxSize },
  fileFilter: (req, file, cb) => {
    if (!whitelist.includes(file.mimetype)) {
      return cb(new Error("file is not allowed"));
    }

    cb(null, true);
  },
});

const app = express();

const corsOptions = {
  origin: ["https://idyllic-marzipan-b90e38.netlify.app"],
  credentials: true,
};
app.use(cors(corsOptions));
app.use(express.static("public"));
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRoutes);
app.use(auth);
app.use("/api/users", userRoutes);
app.put("/api/users/:userUUID", upload.single("profile_picture"), editUser);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);
app.get("/api/search/:userUUID", search);

app.use(errorHandler);

export default app;

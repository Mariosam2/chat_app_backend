import express from "express";
import { errorHandler } from "./middlewares/errorHandler";
import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";
import userRoutes from "./routes/userRoutes";
import authRoutes from "./routes/authRoutes";
import { auth } from "./middlewares/auth";

const app = express();

app.use(express.static("public"));
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use(auth);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

app.use(errorHandler);

export default app;

import express from "express";

import { errorHandler } from "./middlewares/errorHandler";

import chatRoutes from "./routes/chatRoutes";
import messageRoutes from "./routes/messageRoutes";

const app = express();

app.use(express.json());

app.use("/api/chats", chatRoutes);
app.use("/api/messages", messageRoutes);

app.use(errorHandler);

export default app;

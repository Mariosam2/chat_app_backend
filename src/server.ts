import { createServer } from "http";
import app from "./app";
import jwt from "jsonwebtoken";
import { ExtendedError, Server } from "socket.io";
import { PrismaClient, Chat } from "../client";
import { getEnvOrThrow } from "./controllers/helpers";

const prisma = new PrismaClient();

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
});

const isSocketError = (obj: unknown): obj is ExtendedError => {
  if ((obj as ExtendedError).data) {
    return true;
  }
  return false;
};

io.use((socket, next) => {
  const authToken = socket.handshake.query.token;

  if (typeof authToken === "string") {
    const decodedUser = jwt.verify(authToken, getEnvOrThrow("JWT_SECRET_KEY"));
    if (typeof decodedUser === "object") {
      socket.handshake.auth = { user: decodedUser.user_uuid };
      return next();
    }
    return next(new Error("Unauthorized"));
  }
  return next(new Error("Unauthorized"));
});

io.on("connection", (socket) => {
  console.log(socket);
  socket.on("join", ({ room }) => {
    socket.join(room);
  });
  socket.on(
    "delete chat",
    async ({ room, chats }: { room: string; chats: Chat[] }) => {
      //console.log(socket.handshake);
      try {
        //console.log(room);
        //console.log("delete chat");
        const deletedChat = await prisma.chat.delete({
          where: {
            uuid: room,
          },
        });

        await prisma.userChat.deleteMany({
          where: {
            chat_id: deletedChat.id,
          },
        });

        const updatedChats = chats.filter(
          (chat) => deletedChat.uuid !== chat.uuid
        );

        io.to(room).emit("chat deleted", { updatedChats });
      } catch (err) {
        io.to(room).emit("couldn't delete the chat");
      }
    }
  );
});

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running on port ${process.env.SERVER_PORT}`);
});

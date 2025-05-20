import { createServer } from "http";
import app from "./app";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { PrismaClient, Chat, Message } from "../client";
import { checkIfUserHasMessage, getEnvOrThrow } from "./controllers/helpers";

const prisma = new PrismaClient();

const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://idyllic-marzipan-b90e38.netlify.app",
    credentials: true,
  },
});

interface HandshakeAuthObject {
  user: string;
}

const isAuthObject = (obj: unknown): obj is HandshakeAuthObject => {
  if (obj) {
    return typeof (obj as HandshakeAuthObject).user === "string";
  }
  return false;
};

io.use((socket, next) => {
  try {
    const authToken = socket.handshake.headers.cookie?.split("=")[1];
    if (authToken) {
      const decodedUser = jwt.verify(
        authToken,
        getEnvOrThrow("JWT_SECRET_KEY")
      );

      if (typeof decodedUser === "object") {
        //console.log("updating handshake");
        socket.handshake.auth = { user: decodedUser.user_uuid };
        //console.log(socket.handshake.auth);
        next();
      } else {
        socket.emit("logout", { handsake: socket.handshake.headers });
      }
    } else {
      socket.emit("logout");
    }
  } catch (err) {
    socket.emit("logout");
  }
});

io.on("connection", (socket) => {
  socket.on("join", ({ room }) => {
    //console.log(room);
    socket.join(room);
  });
  socket.on(
    "delete chat",
    async ({ room, chats }: { room: string; chats: Chat[] }) => {
      try {
        const authUser = socket.handshake.auth.user;

        const authUserChats = await prisma.user.findUniqueOrThrow({
          where: {
            uuid: authUser,
          },
          select: {
            chats: {
              where: {
                Chat: {
                  uuid: room,
                },
              },
              select: {
                Chat: {
                  select: {
                    uuid: true,
                  },
                },
              },
            },
          },
        });

        const chatFound = authUserChats.chats.find(
          (chat) => chat.Chat.uuid === room
        );

        if (!chatFound) {
          throw new Error("chat not found");
        }

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
      } catch (err: unknown) {
        socket.emit("chat error", {
          error:
            err instanceof Error
              ? err.message
              : "error while deleting the chat",
        });
      }
    }
  );
  socket.on("send message", async ({ chatUUID, receiverUUID, content }) => {
    try {
      const senderUUID = socket.handshake.auth.user;
      //the a socket room identifier is the same as the chat identifier
      //console.log(chatUUID, senderUUID);

      const sender = await prisma.user.findUniqueOrThrow({
        where: {
          uuid: senderUUID,
        },
      });

      const receiver = await prisma.user.findUniqueOrThrow({
        where: {
          uuid: receiverUUID,
        },
      });

      const userChats = await prisma.userChat.findMany({
        where: {
          user: {
            uuid: {
              in: [senderUUID, receiverUUID],
            },
            chats: {
              some: {
                deleted_at: null,
              },
            },
          },
        },
        select: {
          Chat: {
            select: {
              id: true,
              uuid: true,
            },
          },
        },
      });
      //console.log(userChats);

      const chatFound = userChats.find((chat) => chat.Chat.uuid === chatUUID);

      if (!chatFound) {
        throw new Error("chat not found");
      }

      const newMessageData = {
        sender_id: sender?.id,
        receiver_id: receiver?.id,
        chat_id: chatFound.Chat.id,
        content,
      };
      const newMessage = await prisma.message.create({
        data: newMessageData,
      });

      const { uuid, content: newMessageContent, created_at } = newMessage;
      io.to(chatUUID).emit("message created", {
        message: {
          uuid,
          content: newMessageContent,
          created_at,
          senderUUID: senderUUID,
        },
      });
    } catch (err) {
      //console.log(err instanceof Error);
      socket.emit("message error", {
        error:
          err instanceof Error ? err.message : "error while deleting the chat",
      });
    }
  });
  socket.on(
    "delete message",
    async ({
      room,
      message,
      status,
    }: {
      room: string;
      message: string;
      status: string;
    }) => {
      //console.log("delete message");
      try {
        const authUser = socket.handshake.auth.user;

        const messageFound = await checkIfUserHasMessage(
          authUser,
          message,
          status
        );
        if (!messageFound) {
          throw new Error("message not found");
        }

        const deletedMessage = await prisma.message.delete({
          where: {
            uuid: message,
          },
          select: {
            uuid: true,
          },
        });

        io.to(room).emit("message deleted", {
          messageUUID: deletedMessage.uuid,
        });
      } catch (err: unknown) {
        socket.emit("message error", {
          error:
            err instanceof Error
              ? err.message
              : "error while deleting the chat",
        });
      }
    }
  );
  socket.on(
    "edit message",
    async ({
      room,
      message,
      newMessage,
      status,
    }: {
      room: string;
      message: string;
      newMessage: string;
      status: string;
    }) => {
      try {
        //console.log("edit message");

        const authUser = socket.handshake.auth.user;
        //console.log(room, message, newMessage, status, authUser);
        //console.log(authUser);
        const messageFound = await checkIfUserHasMessage(
          authUser,
          message,
          status
        );

        if (!messageFound) {
          throw new Error("message not found");
        }

        const updatedMessage = await prisma.message.update({
          where: {
            uuid: message,
          },
          data: {
            content: newMessage,
            edited_at: new Date(Date.now()),
          },
          select: {
            uuid: true,
            content: true,
            created_at: true,
            sender: {
              select: {
                uuid: true,
              },
            },
          },
        });

        //console.log(updatedMessage);

        const { sender, ...rest } = updatedMessage;

        io.to(room).emit("message updated", {
          message,
          updatedMessage: { ...rest },
          senderUUID: sender?.uuid,
        });
      } catch (err) {
        //console.log(err);
        socket.emit("message error", {
          error:
            err instanceof Error
              ? err.message
              : "error while deleting the chat",
        });
      }
    }
  );

  socket.on("delete user", async ({ user }) => {
    try {
      const authUser = socket.handshake.auth.user;
      const userFound = await prisma.user.findUnique({
        where: {
          uuid: user,
        },
      });
      if (authUser !== user || !userFound) {
        throw new Error("couldn't find the user");
      }

      await prisma.user.update({
        where: {
          uuid: user,
        },
        data: {
          deleted_at: new Date(Date.now()),
        },
      });

      const userChatsToUpdate = await prisma.userChat.updateMany({
        where: {
          user: {
            uuid: user,
          },
        },
        data: {
          deleted_at: new Date(Date.now()),
        },
      });

      await prisma.chat.deleteMany({
        where: {
          users: {
            some: {
              user: {
                uuid: user,
              },
            },
          },
        },
      });

      await prisma.message.updateMany({
        where: {
          sender: {
            uuid: user,
          },
        },
        data: {
          sender_id: null,
        },
      });

      await prisma.message.updateMany({
        where: {
          receiver: {
            uuid: user,
          },
        },
        data: {
          receiver_id: null,
        },
      });

      socket.emit("logout");
    } catch (err) {
      socket.emit("user error", {
        error:
          err instanceof Error ? err.message : "error while deleting the user",
      });
    }
  });
});

server.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

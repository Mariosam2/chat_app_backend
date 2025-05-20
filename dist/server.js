"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const app_1 = __importDefault(require("./app"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_io_1 = require("socket.io");
const client_1 = require("../client");
const helpers_1 = require("./controllers/helpers");
const prisma = new client_1.PrismaClient();
const server = (0, http_1.createServer)(app_1.default);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: (0, helpers_1.getEnvOrThrow)("CLIENT_ORIGIN"),
        credentials: true,
    },
});
io.use((socket, next) => {
    var _a;
    try {
        //console.log(socket.handshake.headers);
        const authToken = (_a = socket.handshake.headers.cookie) === null || _a === void 0 ? void 0 : _a.split("=")[1];
        if (authToken) {
            const decodedUser = jsonwebtoken_1.default.verify(authToken, (0, helpers_1.getEnvOrThrow)("JWT_SECRET_KEY"));
            if (typeof decodedUser === "object") {
                //console.log("updating handshake");
                socket.handshake.auth = { user: decodedUser.user_uuid };
                //console.log(socket.handshake.auth);
                next();
            }
            else {
                socket.emit("logout");
            }
        }
        else {
            socket.emit("logout");
        }
    }
    catch (err) {
        socket.emit("logout");
    }
});
io.on("connection", (socket) => {
    socket.on("join", ({ room }) => {
        //console.log(room);
        socket.join(room);
    });
    socket.on("delete chat", (_a) => __awaiter(void 0, [_a], void 0, function* ({ room, chats }) {
        try {
            const authUser = socket.handshake.auth.user;
            const authUserChats = yield prisma.user.findUniqueOrThrow({
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
            const chatFound = authUserChats.chats.find((chat) => chat.Chat.uuid === room);
            if (!chatFound) {
                throw new Error("chat not found");
            }
            const deletedChat = yield prisma.chat.delete({
                where: {
                    uuid: room,
                },
            });
            yield prisma.userChat.deleteMany({
                where: {
                    chat_id: deletedChat.id,
                },
            });
            const updatedChats = chats.filter((chat) => deletedChat.uuid !== chat.uuid);
            console.log(room);
            io.to(room).emit("chat deleted", { updatedChats });
        }
        catch (err) {
            socket.emit("chat error", {
                error: err instanceof Error
                    ? err.message
                    : "error while deleting the chat",
            });
        }
    }));
    socket.on("send message", (_a) => __awaiter(void 0, [_a], void 0, function* ({ chatUUID, receiverUUID, content }) {
        try {
            const senderUUID = socket.handshake.auth.user;
            //the a socket room identifier is the same as the chat identifier
            //console.log(chatUUID, senderUUID);
            const sender = yield prisma.user.findUniqueOrThrow({
                where: {
                    uuid: senderUUID,
                },
            });
            const receiver = yield prisma.user.findUniqueOrThrow({
                where: {
                    uuid: receiverUUID,
                },
            });
            const userChats = yield prisma.userChat.findMany({
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
                sender_id: sender === null || sender === void 0 ? void 0 : sender.id,
                receiver_id: receiver === null || receiver === void 0 ? void 0 : receiver.id,
                chat_id: chatFound.Chat.id,
                content,
            };
            const newMessage = yield prisma.message.create({
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
        }
        catch (err) {
            //console.log(err instanceof Error);
            socket.emit("message error", {
                error: err instanceof Error ? err.message : "error while deleting the chat",
            });
        }
    }));
    socket.on("delete message", (_a) => __awaiter(void 0, [_a], void 0, function* ({ room, message, status, }) {
        //console.log("delete message");
        try {
            const authUser = socket.handshake.auth.user;
            const messageFound = yield (0, helpers_1.checkIfUserHasMessage)(authUser, message, status);
            if (!messageFound) {
                throw new Error("message not found");
            }
            const deletedMessage = yield prisma.message.delete({
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
        }
        catch (err) {
            socket.emit("message error", {
                error: err instanceof Error
                    ? err.message
                    : "error while deleting the chat",
            });
        }
    }));
    socket.on("edit message", (_a) => __awaiter(void 0, [_a], void 0, function* ({ room, message, newMessage, status, }) {
        try {
            //console.log("edit message");
            const authUser = socket.handshake.auth.user;
            //console.log(room, message, newMessage, status, authUser);
            //console.log(authUser);
            const messageFound = yield (0, helpers_1.checkIfUserHasMessage)(authUser, message, status);
            if (!messageFound) {
                throw new Error("message not found");
            }
            const updatedMessage = yield prisma.message.update({
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
            const { sender } = updatedMessage, rest = __rest(updatedMessage, ["sender"]);
            io.to(room).emit("message updated", {
                message,
                updatedMessage: Object.assign({}, rest),
                senderUUID: sender === null || sender === void 0 ? void 0 : sender.uuid,
            });
        }
        catch (err) {
            //console.log(err);
            socket.emit("message error", {
                error: err instanceof Error
                    ? err.message
                    : "error while deleting the chat",
            });
        }
    }));
    socket.on("delete user", (_a) => __awaiter(void 0, [_a], void 0, function* ({ user }) {
        try {
            const authUser = socket.handshake.auth.user;
            const userFound = yield prisma.user.findUnique({
                where: {
                    uuid: user,
                },
            });
            if (authUser !== user || !userFound) {
                throw new Error("couldn't find the user");
            }
            yield prisma.user.update({
                where: {
                    uuid: user,
                },
                data: {
                    deleted_at: new Date(Date.now()),
                },
            });
            const userChatsToUpdate = yield prisma.userChat.updateMany({
                where: {
                    user: {
                        uuid: user,
                    },
                },
                data: {
                    deleted_at: new Date(Date.now()),
                },
            });
            yield prisma.chat.deleteMany({
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
            yield prisma.message.updateMany({
                where: {
                    sender: {
                        uuid: user,
                    },
                },
                data: {
                    sender_id: null,
                },
            });
            yield prisma.message.updateMany({
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
        }
        catch (err) {
            socket.emit("user error", {
                error: err instanceof Error ? err.message : "error while deleting the user",
            });
        }
    }));
});
server.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

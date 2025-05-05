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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteForAll = exports.deleteForMe = exports.createChat = exports.getUserChats = void 0;
const helpers_1 = require("./helpers");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("../../client");
const prisma = new client_1.PrismaClient();
//TODO: refactoring see messagecontrollers
const getUserChats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userUUID } = req.params;
        if (!(0, helpers_1.checkRequestData)(userUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const temp = yield prisma.user.findUnique({
            where: {
                uuid: userUUID,
            },
            select: {
                chats: {
                    select: {
                        chat_id: true,
                    },
                },
            },
        });
        if (temp !== null) {
            const userChatIds = temp.chats.map((chatIdObj) => chatIdObj.chat_id);
            const userChats = yield prisma.chat.findMany({
                where: {
                    id: { in: userChatIds },
                },
                select: {
                    uuid: true,
                },
            });
            res.status(200).json({
                success: true,
                chats: userChats.map((userChat) => userChat.uuid),
            });
        }
        else {
            throw (0, http_errors_1.default)(404, "not found");
        }
    }
    catch (err) {
        next(err);
    }
});
exports.getUserChats = getUserChats;
const createChat = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { senderUUID, receiverUUID } = req.body;
        if (!(0, helpers_1.checkRequestData)(senderUUID, receiverUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const sender = yield prisma.user.findUnique({
            where: {
                uuid: senderUUID,
            },
            include: {
                chats: { select: { chat_id: true } },
            },
        });
        const receiver = yield prisma.user.findUnique({
            where: {
                uuid: receiverUUID,
            },
            include: {
                chats: { select: { chat_id: true } },
            },
        });
        if (!sender || !receiver) {
            throw (0, http_errors_1.default)(404, "not found");
        }
        const senderChatIds = sender.chats.map((chat) => chat.chat_id);
        const receiverChatIds = receiver.chats.map((chat) => chat.chat_id);
        const usersHaveChatAlready = (0, helpers_1.checkAndFindMatches)(senderChatIds, receiverChatIds)[0];
        const chatInCommonId = (0, helpers_1.checkAndFindMatches)(senderChatIds, receiverChatIds)[1];
        if (usersHaveChatAlready && chatInCommonId !== null) {
            //if the users have a chat already, return the chat uuid as a response
            const { uuid: chatInCommonUUID } = yield prisma.chat.findUniqueOrThrow({
                where: {
                    id: chatInCommonId,
                },
            });
            res.status(200).json({
                success: true,
                message: "users have a chat already",
                chat: chatInCommonUUID,
            });
        }
        else {
            //if users dont have a chat, create a new one
            yield prisma.chat.create({
                data: {
                    created_at: new Date(),
                    users: {
                        create: [{ user_id: sender.id }, { user_id: receiver.id }],
                    },
                },
            });
            res.status(200).json({
                success: true,
                message: "chat created successfully",
            });
        }
    }
    catch (err) {
        next(err);
    }
});
exports.createChat = createChat;
const deleteForMe = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatUUID: chatToDisconnectUUID } = req.params;
        const { userUUID: userToDisconnectUUID } = req.params;
        if ((0, helpers_1.checkRequestData)(chatToDisconnectUUID, userToDisconnectUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const chatToDisconnect = yield prisma.chat.findFirst({
            where: {
                uuid: chatToDisconnectUUID,
            },
        });
        const userToDisconnect = yield prisma.user.findFirst({
            where: {
                uuid: userToDisconnectUUID,
            },
        });
        if (!chatToDisconnect || !userToDisconnect) {
            throw (0, http_errors_1.default)(404, "not found");
        }
        //drop the table in the userchat having this chat id and user id
        yield prisma.userChat.delete({
            where: {
                user_id_chat_id: {
                    user_id: userToDisconnect.id,
                    chat_id: chatToDisconnect.id,
                },
            },
        });
        res.status(200).json({
            success: true,
            message: "chat deleted for user only",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteForMe = deleteForMe;
const deleteForAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatUUID: chatToDeleteUUID } = req.params;
        if ((0, helpers_1.checkRequestData)(chatToDeleteUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const chatToDelete = yield prisma.chat.findFirst({
            where: {
                uuid: chatToDeleteUUID,
            },
        });
        if (!chatToDelete) {
            throw (0, http_errors_1.default)(404, "not found");
        }
        yield prisma.chat.delete({
            where: {
                id: chatToDelete.id,
            },
        });
        res.status(200).json({
            success: true,
            message: "chat deleted for all successfully",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteForAll = deleteForAll;

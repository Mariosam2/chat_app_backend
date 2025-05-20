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
exports.deleteChatForAll = exports.deleteChatForUser = exports.createChat = exports.getUserChats = void 0;
const helpers_1 = require("./helpers");
const http_errors_1 = __importDefault(require("http-errors"));
const client_1 = require("../../client");
const library_1 = require("../../client/runtime/library");
const prisma = new client_1.PrismaClient();
const getUserChats = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.userUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { userUUID } = req.params;
        const userUserChats = yield prisma.user.findUniqueOrThrow({
            where: {
                uuid: userUUID,
            },
            select: {
                chats: {
                    select: {
                        chat_id: true,
                    },
                    where: {
                        deleted_at: null,
                    },
                },
            },
        });
        const userChatIDS = userUserChats.chats.map((chatIdObj) => chatIdObj.chat_id);
        const userChats = yield prisma.chat.findMany({
            where: {
                id: { in: userChatIDS },
                users: {
                    some: {
                        user: {
                            uuid: {
                                not: userUUID,
                            },
                        },
                    },
                },
            },
            select: {
                uuid: true,
                created_at: true,
                users: {
                    where: { NOT: { user: { uuid: userUUID } } },
                    select: {
                        user: {
                            select: { uuid: true, username: true, profile_picture: true },
                        },
                    },
                },
                messages: {
                    orderBy: { created_at: "desc" },
                    where: {
                        AND: {
                            NOT: {
                                sender_id: null,
                                receiver_id: null,
                            },
                        },
                    },
                    take: 1,
                    select: { uuid: true, content: true, created_at: true },
                },
            },
        });
        const cleanUserChat = userChats.map((userChat) => {
            const { users, messages } = userChat, rest = __rest(userChat, ["users", "messages"]);
            const [lastMessage] = messages;
            const [receiver] = users.map((el) => el.user);
            return Object.assign(Object.assign({}, rest), { lastMessage,
                receiver });
        });
        res.status(200).json({
            success: true,
            chats: cleanUserChat,
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName) === "string") {
                throw (0, http_errors_1.default)(404, ((_c = err.meta) === null || _c === void 0 ? void 0 : _c.modelName.toLowerCase()) + " " + "not found");
            }
        }
        next(err);
    }
});
exports.getUserChats = getUserChats;
const createChat = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.body) === null || _a === void 0 ? void 0 : _a.senderUUID, (_b = req.body) === null || _b === void 0 ? void 0 : _b.receiverUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { senderUUID, receiverUUID } = req.body;
        const sender = yield prisma.user.findUniqueOrThrow({
            where: {
                uuid: senderUUID,
            },
            include: {
                chats: { select: { chat_id: true } },
            },
        });
        const receiver = yield prisma.user.findUniqueOrThrow({
            where: {
                uuid: receiverUUID,
            },
            include: {
                chats: { select: { chat_id: true } },
            },
        });
        const senderChatIds = sender.chats.map((chat) => chat.chat_id);
        const receiverChatIds = receiver.chats.map((chat) => chat.chat_id);
        const usersHaveChatAlready = (0, helpers_1.checkAndFindMatches)(senderChatIds, receiverChatIds)[0];
        const chatInCommonId = (0, helpers_1.checkAndFindMatches)(senderChatIds, receiverChatIds)[1];
        //console.log(chatInCommonId, usersHaveChatAlready);
        if (usersHaveChatAlready && chatInCommonId !== null) {
            const chatInCommon = yield prisma.chat.findUnique({
                where: {
                    id: chatInCommonId,
                },
                select: {
                    uuid: true,
                },
            });
            if (chatInCommon) {
                res.status(400).json({
                    success: false,
                    message: "users have a chat already",
                    chat: chatInCommon.uuid,
                });
            }
        }
        else {
            const newChat = yield prisma.chat.create({
                data: {
                    users: {
                        create: [{ user_id: sender.id }, { user_id: receiver.id }],
                    },
                },
                select: {
                    uuid: true,
                    created_at: true,
                    users: {
                        where: {
                            user: {
                                id: receiver.id,
                            },
                        },
                        select: {
                            user: {
                                select: {
                                    uuid: true,
                                    username: true,
                                    profile_picture: true,
                                },
                            },
                        },
                    },
                },
            });
            const { users } = newChat, rest = __rest(newChat, ["users"]);
            const newChatReceiver = users.map((user) => {
                return user.user;
            })[0];
            res.status(200).json({
                success: true,
                message: "chat created successfully",
                chat: Object.assign(Object.assign({}, rest), { lastMessage: null, receiver: newChatReceiver }),
            });
        }
        //if users dont have a chat, create a new one with users relation
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_c = err.meta) === null || _c === void 0 ? void 0 : _c.modelName) === "string") {
                throw (0, http_errors_1.default)(404, ((_d = err.meta) === null || _d === void 0 ? void 0 : _d.modelName.toLowerCase()) + " " + "not found");
            }
        }
        next(err);
    }
});
exports.createChat = createChat;
const deleteChatForUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.chatUUID, (_b = req.params) === null || _b === void 0 ? void 0 : _b.userUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { chatUUID: chatToDisconnectUUID } = req.params;
        const { userUUID: userToDisconnectUUID } = req.params;
        const chatToDisconnect = yield prisma.chat.findUniqueOrThrow({
            where: {
                uuid: chatToDisconnectUUID,
            },
        });
        const userToDisconnect = yield prisma.user.findUniqueOrThrow({
            where: {
                uuid: userToDisconnectUUID,
            },
        });
        //check if they are related first
        yield prisma.userChat.findUniqueOrThrow({
            where: {
                user_id_chat_id: {
                    user_id: userToDisconnect.id,
                    chat_id: chatToDisconnect.id,
                },
            },
        });
        //drop the table in the userchat having this chat id and user id
        yield prisma.userChat.update({
            where: {
                user_id_chat_id: {
                    user_id: userToDisconnect.id,
                    chat_id: chatToDisconnect.id,
                },
            },
            data: {
                deleted_at: new Date(Date.now()),
            },
        });
        //console.log(chatToDisconnectUUID);
        res.status(200).json({
            success: true,
            message: "chat deleted for user only",
            chat_uuid: chatToDisconnect.uuid,
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_c = err.meta) === null || _c === void 0 ? void 0 : _c.modelName) === "string") {
                if (err.meta.modelName === "UserChat") {
                    throw (0, http_errors_1.default)(404, "this user doesn't have this chat");
                }
                throw (0, http_errors_1.default)(404, err.meta.modelName.toLowerCase() + " " + "not found");
            }
        }
        next(err);
    }
});
exports.deleteChatForUser = deleteChatForUser;
const deleteChatForAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.chatUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { chatUUID: chatToDeleteUUID } = req.params;
        const deletedChat = yield prisma.chat.delete({
            where: {
                uuid: chatToDeleteUUID,
            },
        });
        //drop the relation manually since prisma onCascade not working
        yield prisma.userChat.deleteMany({
            where: {
                chat_id: deletedChat.id,
            },
        });
        res.status(200).json({
            success: true,
            message: "chat deleted for all successfully",
            chat_uuid: deletedChat.uuid,
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName) === "string") {
                throw (0, http_errors_1.default)(404, ((_c = err.meta) === null || _c === void 0 ? void 0 : _c.modelName.toLowerCase()) + " " + "not found");
            }
        }
        next(err);
    }
});
exports.deleteChatForAll = deleteChatForAll;

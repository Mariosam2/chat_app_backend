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
exports.deleteMessageForAll = exports.deleteMessageForUser = exports.editMessage = exports.createMessage = exports.getChatMessages = exports.getChatUserMessages = void 0;
const helpers_1 = require("./helpers");
const client_1 = require("../../client");
const http_errors_1 = __importDefault(require("http-errors"));
const library_1 = require("../../client/runtime/library");
const prisma = new client_1.PrismaClient();
const getChatUserMessages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.userUUID, (_b = req.params) === null || _b === void 0 ? void 0 : _b.chatUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { userUUID, chatUUID } = req.params;
        const userMessages = yield prisma.user.findFirstOrThrow({
            where: {
                uuid: userUUID,
            },
            select: {
                sentMessages: {
                    where: {
                        Chat: {
                            uuid: chatUUID,
                        },
                    },
                    select: {
                        uuid: true,
                        content: true,
                        created_at: true,
                        edited_at: true,
                    },
                },
                receivedMessages: {
                    where: {
                        Chat: {
                            uuid: chatUUID,
                        },
                    },
                    select: {
                        uuid: true,
                        content: true,
                        created_at: true,
                        edited_at: true,
                    },
                },
            },
        });
        const { sentMessages, receivedMessages } = userMessages;
        // add a status for the client to style the sent and received message + sort by date
        const allMessages = sentMessages
            .map((sent) => {
            return Object.assign(Object.assign({}, sent), { status: "sent" });
        })
            .concat(receivedMessages.map((received) => {
            return Object.assign(Object.assign({}, received), { status: "received" });
        }))
            .sort((a, b) => {
            if (a.created_at > b.created_at) {
                return 1;
            }
            else if (a.created_at < b.created_at) {
                return -1;
            }
            return 0;
        });
        res.status(200).json({
            success: true,
            messages: allMessages,
        });
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
exports.getChatUserMessages = getChatUserMessages;
const getChatMessages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.chatUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { chatUUID } = req.params;
        const chatMessages = yield prisma.chat.findUniqueOrThrow({
            where: {
                uuid: chatUUID,
            },
            select: {
                messages: {
                    select: {
                        uuid: true,
                        content: true,
                        created_at: true,
                        sender: { select: { uuid: true } },
                        receiver: { select: { uuid: true } },
                    },
                },
            },
        });
        res.status(200).json({
            success: true,
            messages: chatMessages,
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
exports.getChatMessages = getChatMessages;
const checkMessageCreation = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.$transaction(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const messageChat = yield prisma.chat.findUniqueOrThrow({
                where: {
                    uuid: payload.chatUUID,
                },
                include: {
                    users: true,
                },
            });
            const messageSender = yield prisma.user.findUniqueOrThrow({
                where: {
                    uuid: payload.senderUUID,
                },
                include: {
                    chats: true,
                },
            });
            const messageReceiver = yield prisma.user.findUniqueOrThrow({
                where: {
                    uuid: payload.receiverUUID,
                },
                include: {
                    chats: true,
                },
            });
            //check if sender and receiver are related to the chat
            const messageChatUserChats = yield prisma.userChat.findMany({
                where: {
                    chat_id: messageChat.id,
                },
            });
            const messageChatUsers = messageChatUserChats.map((userChat) => userChat.user_id);
            if (!messageChatUsers.includes(messageSender.id) ||
                !messageChatUsers.includes(messageReceiver.id)) {
                throw (0, http_errors_1.default)(400, "users are not related to the chat");
            }
            const newMessage = {
                content: payload.content,
                sender_id: messageSender.id,
                receiver_id: messageReceiver.id,
                chat_id: messageChat.id,
            };
            yield prisma.message.create({
                data: newMessage,
            });
        }
        catch (err) {
            if (err instanceof library_1.PrismaClientKnownRequestError) {
                if (err.code === "P2025" && typeof ((_a = err.meta) === null || _a === void 0 ? void 0 : _a.modelName) === "string") {
                    throw (0, http_errors_1.default)(404, ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName.toLowerCase()) + " " + "not found");
                }
            }
            else if (http_errors_1.default.isHttpError(err)) {
                if (err.statusCode === 400) {
                    throw err;
                }
            }
            else {
                throw (0, http_errors_1.default)(424, "an error occured during the message creation");
            }
        }
    }));
});
const validateMessagePayload = (obj) => {
    //console.log(obj);
    if (!(0, helpers_1.validateUUIDS)(obj.chatUUID, obj.senderUUID, obj.receiverUUID) ||
        typeof obj.content !== "string") {
        return false;
    }
    return true;
};
const createMessage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    //get chat uuid, sender uuid and receiver uuid from body
    if (!validateMessagePayload(req.body)) {
        throw (0, http_errors_1.default)(400, "bad request");
    }
    const { chatUUID, senderUUID, receiverUUID, content } = req.body;
    const messagePayload = {
        chatUUID,
        senderUUID,
        receiverUUID,
        content,
    };
    yield checkMessageCreation(messagePayload);
    res.status(200).json({
        success: true,
        message: "message created successfully",
    });
    try {
    }
    catch (err) {
        next(err);
    }
});
exports.createMessage = createMessage;
//type check for req.body
const validateEditableMessage = (obj) => {
    return typeof obj.content === "string";
};
const editMessage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.messageUUID) ||
            !validateEditableMessage(req.body)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { messageUUID: messageToEditUUID } = req.params;
        const editableMessage = req.body;
        yield prisma.message.update({
            where: {
                uuid: messageToEditUUID,
            },
            data: editableMessage,
        });
        res.status(200).json({
            success: true,
            message: "message edited successfully",
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
exports.editMessage = editMessage;
const checkIfUserIsSenderOrReceiver = (messageUUID, wasMessageSent) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.$transaction(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        try {
            const fieldToUpdate = wasMessageSent ? "sender_id" : "receiver_id";
            const deletedMessage = yield prisma.message.findUniqueOrThrow({
                where: {
                    uuid: messageUUID,
                },
            });
            if (deletedMessage[fieldToUpdate] === null) {
                throw (0, http_errors_1.default)(400, "message already deleted for this user");
            }
            yield prisma.message.update({
                where: {
                    uuid: messageUUID,
                },
                data: {
                    [fieldToUpdate]: null,
                },
            });
        }
        catch (err) {
            if (err instanceof library_1.PrismaClientKnownRequestError) {
                if (err.code === "P2025" && typeof ((_a = err.meta) === null || _a === void 0 ? void 0 : _a.modelName) === "string") {
                    throw (0, http_errors_1.default)(404, ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName.toLowerCase()) + " " + "not found");
                }
            }
            else if (http_errors_1.default.isHttpError(err)) {
                if (err.statusCode === 400) {
                    throw err;
                }
            }
            else {
                throw (0, http_errors_1.default)(424, "an error occured during the message deletion");
            }
        }
    }));
});
const deleteMessageForUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.messageUUID, (_b = req.params) === null || _b === void 0 ? void 0 : _b.userUUID) ||
            !req.query["sent"] ||
            typeof (req.query["sent"] === "true") !== "boolean") {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { messageUUID: messageToDisconnectUUID } = req.params;
        //I need to check if the user sending the request is the sender or the receiver
        //of the message, and set to null accordingly
        //this informations is passed in the body of the request (type SenderOrReceiver)
        const wasMessageSent = req.query["sent"] === "true";
        yield checkIfUserIsSenderOrReceiver(messageToDisconnectUUID, wasMessageSent);
        res.status(200).json({
            success: true,
            message: "message deleted for user only",
            message_uuid: messageToDisconnectUUID,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteMessageForUser = deleteMessageForUser;
const deleteMessageForAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.messageUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { messageUUID: messageToDeleteUUID } = req.params;
        yield prisma.message.delete({
            where: {
                uuid: messageToDeleteUUID,
            },
        });
        res.status(200).json({
            success: true,
            message: "message deleted for all",
            message_uuid: messageToDeleteUUID,
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
exports.deleteMessageForAll = deleteMessageForAll;

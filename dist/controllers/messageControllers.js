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
exports.deleteMessageForAll = exports.deleteMessageForUser = exports.editMessage = exports.createMessage = exports.getChatMessages = exports.getUserMessages = void 0;
const helpers_1 = require("./helpers");
const client_1 = require("../../client");
const http_errors_1 = __importDefault(require("http-errors"));
const prisma = new client_1.PrismaClient();
const getUserMessages = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userUUID } = req.params;
        if (!(0, helpers_1.checkRequestData)(userUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const userMessages = yield prisma.user.findFirst({
            where: {
                uuid: userUUID,
            },
            select: {
                sentMessages: {
                    select: { uuid: true, content: true, created_at: true },
                },
                receivedMessages: {
                    select: { uuid: true, content: true, created_at: true },
                },
            },
        });
        if (!userMessages) {
            throw (0, http_errors_1.default)(404, "not found");
        }
        res.status(200).json({
            success: true,
            messages: userMessages,
        });
    }
    catch (err) {
        next(err);
    }
});
exports.getUserMessages = getUserMessages;
const getChatMessages = (req, res, next) => {
    try {
        const { chatUUID } = req.params;
        if (!(0, helpers_1.checkRequestData)(chatUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const chatMessages = prisma.chat.findFirst({
            where: {
                uuid: chatUUID,
            },
            select: {
                messages: { select: { uuid: true, content: true, created_at: true } },
            },
        });
        if (!chatMessages) {
            throw (0, http_errors_1.default)(404, "not found");
        }
        res.status(200).json({
            success: true,
            messages: chatMessages,
        });
    }
    catch (err) {
        next(err);
    }
};
exports.getChatMessages = getChatMessages;
const checkMessageCreation = (payload) => __awaiter(void 0, void 0, void 0, function* () {
    return prisma.$transaction(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const messageChat = yield prisma.chat.findUniqueOrThrow({
                where: {
                    uuid: payload.chatUUID,
                },
            });
            const messageSender = yield prisma.user.findUniqueOrThrow({
                where: {
                    uuid: payload.senderUUID,
                },
            });
            const messageReceiver = yield prisma.user.findUniqueOrThrow({
                where: {
                    uuid: payload.receiverUUID,
                },
            });
            const message = {
                content: payload.content,
                sender_id: messageSender.id,
                receiver_id: messageReceiver.id,
                chat_id: messageChat.id,
                created_at: new Date(),
            };
            yield prisma.message.create({
                data: message,
            });
            return true;
        }
        catch (err) {
            return false;
        }
    }));
});
const createMessage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    //get chat uuid, sender uuid and receiver uuid from body
    const { chatUUID, senderUUID, receiverUUID, content } = req.body;
    if (!(0, helpers_1.checkRequestData)(chatUUID, senderUUID, receiverUUID, content)) {
        throw (0, http_errors_1.default)(400, "bad request");
    }
    const payload = {
        chatUUID,
        senderUUID,
        receiverUUID,
        content,
    };
    const wasMessageCreated = yield checkMessageCreation(payload);
    if (!wasMessageCreated) {
        throw (0, http_errors_1.default)(424, "unprocessable content");
    }
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
const isEditableMessage = (obj) => {
    return typeof obj.content === "string";
};
const editMessage = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageUUID: messageToEditUUID } = req.params;
        if (!(0, helpers_1.checkRequestData)(messageToEditUUID) || !isEditableMessage(req.body)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const editableMessage = req.body;
        const editedMessage = yield prisma.message.update({
            where: {
                uuid: messageToEditUUID,
            },
            data: editableMessage,
        });
        if (!editedMessage) {
            throw (0, http_errors_1.default)(424, "unprocessable content");
        }
        res.status(200).json({
            success: true,
            message: "message edited successfully",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.editMessage = editMessage;
const deleteMessageForUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //to delete a message for user  we just remove sender_id
        const { messageUUID: messageToDisconnectUUID } = req.params;
        if (!(0, helpers_1.checkRequestData)(messageToDisconnectUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const messageToDisconnect = yield prisma.message.update({
            where: {
                uuid: messageToDisconnectUUID,
            },
            data: {
                sender_id: null,
            },
        });
        if (!messageToDisconnect) {
            throw (0, http_errors_1.default)(424, "unprocessable content");
        }
        res.status(200).json({
            success: true,
            message: "message deleted for user only",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteMessageForUser = deleteMessageForUser;
const deleteMessageForAll = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { messageUUID: messageToDeleteUUID } = req.params;
        if (!(0, helpers_1.checkRequestData)(messageToDeleteUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const messageToDelete = yield prisma.message.delete({
            where: {
                uuid: messageToDeleteUUID,
            },
        });
        if (!messageToDelete) {
            throw (0, http_errors_1.default)(404, "not found");
        }
        res.status(200).json({
            success: true,
            message: "message deleted for all",
        });
    }
    catch (err) {
        next(err);
    }
});
exports.deleteMessageForAll = deleteMessageForAll;

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
exports.checkIfUserHasMessage = exports.getDateFromNow = exports.checkAndFindMatches = exports.validateUUIDS = exports.getEnvOrThrow = void 0;
const validator_1 = __importDefault(require("validator"));
require("express");
const client_1 = require("../../client");
const prisma = new client_1.PrismaClient();
const getEnvOrThrow = (name) => {
    if (!process.env[name]) {
        throw new Error("missing variable in .env file");
    }
    return process.env[name];
};
exports.getEnvOrThrow = getEnvOrThrow;
const validateUUIDS = (...uuids) => {
    for (let i = 0; i < uuids.length; i++) {
        if (!uuids[i] || !validator_1.default.isUUID(uuids[i], 4)) {
            return false;
        }
        return true;
    }
};
exports.validateUUIDS = validateUUIDS;
const checkAndFindMatches = (senderChatIds, receiverChatIds) => {
    for (let i = 0; i < senderChatIds.length; i++) {
        const chatId = senderChatIds[i];
        if (receiverChatIds.includes(chatId)) {
            return [true, chatId];
        }
    }
    return [false, null];
};
exports.checkAndFindMatches = checkAndFindMatches;
const getDateFromNow = (days) => {
    const now = new Date(Date.now());
    const addDays = now.getDate() + days;
    now.setDate(addDays);
    return now;
};
exports.getDateFromNow = getDateFromNow;
const checkIfUserHasMessage = (authUser, message, status) => __awaiter(void 0, void 0, void 0, function* () {
    const authUserMessages = yield prisma.user.findUnique({
        where: {
            uuid: authUser,
        },
        select: {
            sentMessages: {
                where: {
                    uuid: message,
                },
            },
            receivedMessages: {
                where: {
                    uuid: message,
                },
            },
        },
    });
    /*  console.log(authUserMessages); */
    const messageFound = authUserMessages === null || authUserMessages === void 0 ? void 0 : authUserMessages.sentMessages.find((sentMessage) => sentMessage.uuid === message);
    return messageFound;
});
exports.checkIfUserHasMessage = checkIfUserHasMessage;

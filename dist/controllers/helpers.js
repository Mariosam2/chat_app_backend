"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAndFindMatches = exports.checkRequestData = void 0;
const checkRequestData = (...data) => {
    for (let i = 0; i < data.length; i++) {
        if (!data[i] || typeof data[i] !== "string") {
            return false;
        }
        return true;
    }
};
exports.checkRequestData = checkRequestData;
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

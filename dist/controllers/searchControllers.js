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
exports.search = void 0;
const client_1 = require("../../client");
const helpers_1 = require("./helpers");
const http_errors_1 = __importDefault(require("http-errors"));
const prisma = new client_1.PrismaClient();
const search = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.userUUID) &&
            typeof ((_b = req.query) === null || _b === void 0 ? void 0 : _b.query) !== "string") {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const userUUID = (_c = req.params) === null || _c === void 0 ? void 0 : _c.userUUID;
        //console.log(userUUID);
        const query = (_e = (_d = req.query) === null || _d === void 0 ? void 0 : _d.query) === null || _e === void 0 ? void 0 : _e.toString();
        const userChats = yield prisma.chat.findMany({
            where: {
                users: {
                    some: {
                        user: {
                            uuid: userUUID,
                        },
                    },
                },
            },
            select: {
                id: true,
            },
        });
        const userChatIDS = userChats.map((chat) => chat.id);
        const messages = yield prisma.message.findMany({
            where: {
                content: { contains: query },
                chat_id: {
                    in: userChatIDS,
                },
                NOT: { sender: null },
            },
            select: {
                uuid: true,
                content: true,
                Chat: {
                    select: {
                        uuid: true,
                    },
                },
                receiver: {
                    select: {
                        uuid: true,
                        username: true,
                        profile_picture: true,
                    },
                },
                sender: {
                    select: {
                        uuid: true,
                        username: true,
                        profile_picture: true,
                    },
                },
            },
        });
        let previousChatUUID = "";
        let cleanMessages = [];
        for (let i = 0; i < messages.length; i++) {
            const message = messages[i];
            const { sender, receiver, Chat } = message, rest = __rest(message, ["sender", "receiver", "Chat"]);
            if (Chat.uuid !== previousChatUUID) {
                previousChatUUID = Chat.uuid;
                if (receiver && (receiver === null || receiver === void 0 ? void 0 : receiver.uuid) !== userUUID) {
                    cleanMessages.push(Object.assign(Object.assign({}, rest), { user: receiver, chat: Chat }));
                }
                else if (sender) {
                    cleanMessages.push(Object.assign(Object.assign({}, rest), { user: sender, chat: Chat }));
                }
            }
        }
        const users = yield prisma.user.findMany({
            where: {
                username: { contains: query },
                NOT: {
                    uuid: userUUID,
                },
                deleted_at: null,
                chats: {
                    none: {
                        chat_id: {
                            in: userChatIDS,
                        },
                    },
                },
            },
            select: {
                uuid: true,
                username: true,
                profile_picture: true,
            },
        });
        res.status(200).json({
            success: true,
            results: {
                users,
                messages: cleanMessages,
            },
        });
    }
    catch (err) {
        next(err);
    }
});
exports.search = search;

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
const client_1 = require("../../client");
const faker_1 = require("@faker-js/faker");
const bcrypt_1 = __importDefault(require("bcrypt"));
const helpers_1 = require("../controllers/helpers");
const prisma = new client_1.PrismaClient();
const chatsNum = 20;
const usersNum = 10;
let chatRecords = 0;
const generatePassword = (plaintextPassword, saltRounds) => __awaiter(void 0, void 0, void 0, function* () {
    const hashedPassword = yield bcrypt_1.default.hash(plaintextPassword, saltRounds);
    return hashedPassword;
});
function insertUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        const userRecords = yield prisma.user.count();
        if (userRecords === 0) {
            const randomUsers = [];
            for (let i = 0; i < usersNum; i++) {
                const user = {
                    username: faker_1.faker.internet.username(),
                    email: faker_1.faker.internet.email(),
                    password: yield generatePassword("strongpassword", 12),
                    deleted_at: null,
                };
                randomUsers.push(user);
            }
            //console.log(randomUsers);
            yield prisma.user.createMany({
                data: randomUsers,
            });
        }
    });
}
function createChats() {
    return __awaiter(this, void 0, void 0, function* () {
        chatRecords = yield prisma.chat.count();
        const chats = new Array(chatsNum).fill({});
        yield prisma.chat.createMany({
            data: chats,
        });
    });
}
function createMessages() {
    return __awaiter(this, void 0, void 0, function* () {
        const messages = [];
        for (let i = 0; i < 100; i++) {
            const sender_id = faker_1.faker.number.bigInt({ min: 1, max: usersNum });
            //seeding the messages following the relations between users and chats
            const senderUserChats = yield prisma.userChat.findMany({
                where: {
                    user_id: sender_id,
                },
                select: {
                    chat_id: true,
                },
            });
            if (senderUserChats && senderUserChats.length !== 0) {
                const userChatsNum = senderUserChats.length;
                const senderRandomChatID = senderUserChats[faker_1.faker.number.int({
                    min: 0,
                    max: userChatsNum > 0 ? userChatsNum - 1 : userChatsNum,
                })];
                const receiver = yield prisma.chat.findUnique({
                    where: {
                        id: senderRandomChatID.chat_id,
                    },
                    select: {
                        users: {
                            where: {
                                NOT: { user: { id: sender_id } },
                            },
                            select: {
                                user: { select: { id: true } },
                            },
                        },
                    },
                });
                const receiver_id = receiver === null || receiver === void 0 ? void 0 : receiver.users.map((el) => el.user.id)[0];
                if (senderRandomChatID && receiver_id) {
                    const message = {
                        content: faker_1.faker.word.words(5),
                        chat_id: senderRandomChatID.chat_id,
                        sender_id,
                        receiver_id,
                        created_at: (0, helpers_1.getDateFromNow)(-i),
                    };
                    //check if sender and receiver are not equal before pushing
                    if (message.sender_id !== message.receiver_id) {
                        messages.push(message);
                    }
                }
            }
        }
        yield prisma.message.createMany({
            data: messages,
        });
    });
}
//a duplicate is considered on a pair of users (1,4) === (4,1)=> true
const hasDuplicates = (array, needle) => {
    return array.some((element) => {
        const elementPair = [element.sender_id, element.receiver_id];
        return (elementPair.includes(needle.sender_id) &&
            elementPair.includes(needle.receiver_id));
    });
};
//a duplicate is considered on a pair of users (1,4) === (4,1)=> true
const hasDuplicatesInDb = (needle) => __awaiter(void 0, void 0, void 0, function* () {
    //get sender chat ids
    const senderChatIds = yield prisma.userChat.findMany({
        where: {
            user_id: needle.sender_id,
        },
        select: {
            chat_id: true,
        },
    });
    //get the receiver chat ids and map them to an array of chat ids
    const receiverChatIds = yield prisma.userChat.findMany({
        where: {
            user_id: needle.receiver_id,
        },
        select: {
            chat_id: true,
        },
    });
    const receiverChatIdsArr = receiverChatIds.map((element) => element.chat_id);
    //check if one of senderChatIds is contained in the array of receiver chat ids
    return senderChatIds.some((senderChatId) => receiverChatIdsArr.includes(senderChatId.chat_id));
});
function createUsersChats() {
    return __awaiter(this, void 0, void 0, function* () {
        const usersChats = [];
        const chatUsersArray = [];
        for (let i = 0; i < chatsNum; i++) {
            const senderId = faker_1.faker.number.bigInt({ min: 1, max: usersNum });
            const receiverId = faker_1.faker.number.bigInt({ min: 1, max: usersNum });
            //everytime i run seeder i want to start from the number of chats already present inside database
            //console.log(typeof chatRecords);
            const chatId = BigInt(i + (chatRecords === 0 ? 1 : chatRecords));
            const chatExists = yield prisma.chat.findUnique({
                where: {
                    id: chatId,
                },
            });
            //each chat should have 2 users only (no groups feature)
            // and 2 (pair) users should have 1 chat only
            const senderUserChat = {
                user_id: senderId,
                chat_id: chatId,
            };
            const receiverUserChat = {
                user_id: receiverId,
                chat_id: chatId,
            };
            const chatUsers = { sender_id: senderId, receiver_id: receiverId };
            //check if a chat has the same pair of users multiple times
            //check if sender and receiver are not equal
            //check if sender or receiver obj is already in database
            const isUserChatInDb = yield prisma.userChat.findMany({
                where: {
                    OR: [
                        {
                            user_id: senderUserChat.user_id,
                            chat_id: senderUserChat.chat_id,
                        },
                        {
                            user_id: receiverUserChat.user_id,
                            chat_id: receiverUserChat.chat_id,
                        },
                    ],
                },
            });
            const doUsersHaveChatAlready = yield hasDuplicatesInDb(chatUsers);
            if (!hasDuplicates(chatUsersArray, chatUsers) &&
                !doUsersHaveChatAlready &&
                isUserChatInDb.length === 0 &&
                senderId !== receiverId &&
                chatExists) {
                //console.log(usersChats);
                chatUsersArray.push(chatUsers);
                usersChats.push(senderUserChat, receiverUserChat);
            }
        }
        yield prisma.userChat.createMany({
            data: usersChats,
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield insertUsers();
        yield createChats();
        yield createUsersChats();
        yield createMessages();
    });
}
main()
    .then(() => __awaiter(void 0, void 0, void 0, function* () {
    yield prisma.$disconnect();
}))
    .catch((e) => __awaiter(void 0, void 0, void 0, function* () {
    console.error(e);
    yield prisma.$disconnect();
    process.exit(1);
}));

import { PrismaClient, User, Chat, Message, UserChat } from "../prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

const chatsNum = 20;
const usersNum = 10;

const generatePassword = async (
  plaintextPassword: string,
  saltRounds: number
) => {
  const hashedPassword = await bcrypt.hash(plaintextPassword, saltRounds);
  return hashedPassword;
};

async function insertUsers() {
  const randomUsers: Omit<User, "id">[] = [];
  for (let i = 0; i < usersNum; i++) {
    const user = {
      username: faker.internet.username(),
      email: faker.internet.email(),
      password: await generatePassword("strongpassword", 10),
      created_at: new Date(),
      deleted_at: null,
    };
    randomUsers.push(user);
  }
  //console.log(randomUsers);
  await prisma.user.createMany({
    data: randomUsers,
  });
}

async function createChats() {
  const chats: Omit<Chat, "id">[] = [];
  for (let i = 0; i < chatsNum; i++) {
    const chat = {
      created_at: new Date(),
    };
    chats.push(chat);
  }
  await prisma.chat.createMany({
    data: chats,
  });
}

async function createMessages() {
  const messages: Omit<Message, "id">[] = [];
  for (let i = 0; i < 100; i++) {
    const message = {
      content: faker.word.words(5),
      chat_id: faker.number.bigInt({ min: 1, max: chatsNum }),
      sender_id: faker.number.bigInt({ min: 1, max: usersNum }),
      receiver_id: faker.number.bigInt({ min: 1, max: usersNum }),
      created_at: new Date(),
    };
    //check if sender and receiver are not equal before pushing
    if (message.sender_id !== message.receiver_id) {
      messages.push(message);
    }
  }

  await prisma.message.createMany({
    data: messages,
  });
}

interface PairOfUsers {
  sender_id: bigint;
  receiver_id: bigint;
}
//a duplicate is considered on a pair of users (1,4) === (4,1)=> true
const hasDuplicates = (array: PairOfUsers[], needle: PairOfUsers) => {
  return array.some((element) => {
    const elementPair = [element.sender_id, element.receiver_id];
    return (
      elementPair.includes(needle.sender_id) &&
      elementPair.includes(needle.receiver_id)
    );
  });
};

async function createUsersChats() {
  const usersChats: UserChat[] = [];
  const chatUsersArray: PairOfUsers[] = [];

  for (let i = 0; i < chatsNum; i++) {
    const senderId = faker.number.bigInt({ min: 1, max: usersNum });
    const receiverId = faker.number.bigInt({ min: 1, max: usersNum });
    const chatId = BigInt(i + 1);

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
    // and check if sender and receiver are not equal
    if (!hasDuplicates(chatUsersArray, chatUsers) && senderId !== receiverId) {
      //console.log(usersChats);
      chatUsersArray.push(chatUsers);
      usersChats.push(senderUserChat, receiverUserChat);
    }
  }

  await prisma.userChat.createMany({
    data: usersChats,
  });
}

async function main() {
  await insertUsers();
  await createChats();
  await createMessages();
  await createUsersChats();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

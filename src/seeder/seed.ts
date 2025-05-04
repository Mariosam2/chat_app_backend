import { PrismaClient, User, Chat, Message, UserChat } from "../prisma/client";
import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

const chatsNum = 20;
const usersNum = 10;
let chatRecords = 0;

const generatePassword = async (
  plaintextPassword: string,
  saltRounds: number
) => {
  const hashedPassword = await bcrypt.hash(plaintextPassword, saltRounds);
  return hashedPassword;
};

async function insertUsers() {
  const randomUsers: Omit<User, "id" | "uuid">[] = [];
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
  chatRecords = await prisma.chat.count();
  const chats: Omit<Chat, "id" | "uuid">[] = [];
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
  const messages: Omit<Message, "id" | "uuid">[] = [];
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

//a duplicate is considered on a pair of users (1,4) === (4,1)=> true
const hasDuplicatesInDb = async (needle: PairOfUsers) => {
  //get sender chat ids
  const senderChatIds = await prisma.userChat.findMany({
    where: {
      user_id: needle.sender_id,
    },
    select: {
      chat_id: true,
    },
  });

  //get the receiver chat ids and map them to an array of chat ids
  const receiverChatIds = await prisma.userChat.findMany({
    where: {
      user_id: needle.receiver_id,
    },
    select: {
      chat_id: true,
    },
  });

  const receiverChatIdsArr = receiverChatIds.map((element) => element.chat_id);

  //check if one of senderChatIds is contained in the array of receiver chat ids
  return senderChatIds.some((senderChatId) =>
    receiverChatIdsArr.includes(senderChatId.chat_id)
  );
};

async function createUsersChats() {
  const usersChats: UserChat[] = [];
  const chatUsersArray: PairOfUsers[] = [];

  for (let i = 0; i < chatsNum; i++) {
    const senderId = faker.number.bigInt({ min: 1, max: usersNum });
    const receiverId = faker.number.bigInt({ min: 1, max: usersNum });
    //everytime i run seeder i want to start from the number of chats already present inside database
    //console.log(typeof chatRecords);
    const chatId = BigInt(i + (chatRecords === 0 ? 1 : chatRecords));

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
    const isUserChatInDb = await prisma.userChat.findMany({
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

    const doUsersHaveChatAlready = await hasDuplicatesInDb(chatUsers);

    if (
      !hasDuplicates(chatUsersArray, chatUsers) &&
      !doUsersHaveChatAlready &&
      isUserChatInDb.length === 0 &&
      senderId !== receiverId
    ) {
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

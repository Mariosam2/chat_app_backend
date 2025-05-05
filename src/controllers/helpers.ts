export const checkRequestData = (...data: any[]) => {
  for (let i = 0; i < data.length; i++) {
    if (!data[i] || typeof data[i] !== "string") {
      return false;
    }

    return true;
  }
};

export const checkAndFindMatches = (
  senderChatIds: bigint[],
  receiverChatIds: bigint[]
): [boolean, bigint | null] => {
  for (let i = 0; i < senderChatIds.length; i++) {
    const chatId = senderChatIds[i];
    if (receiverChatIds.includes(chatId)) {
      return [true, chatId];
    }
  }

  return [false, null];
};

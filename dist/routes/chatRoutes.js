"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatControllers_1 = require("../controllers/chatControllers");
const router = (0, express_1.Router)();
router.get("/:userUUID", chatControllers_1.getUserChats);
//the creation will be done with a sender(user) a receiver(user) and a message,
//handled using request body
router.post("/", chatControllers_1.createChat);
//delete the table in userchat to delete only for user
router.delete("/:chatUUID/:userUUID", chatControllers_1.deleteChatForUser);
router.delete("/:chatUUID", chatControllers_1.deleteChatForAll);
exports.default = router;

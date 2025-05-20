"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const messageControllers_1 = require("../controllers/messageControllers");
const router = (0, express_1.Router)();
router.get("/:userUUID/:chatUUID", messageControllers_1.getChatUserMessages);
router.get("/chat/:chatUUID", messageControllers_1.getChatMessages);
//save the message in a chat sent via body of the request
router.post("/", messageControllers_1.createMessage);
router.put("/:messageUUID", messageControllers_1.editMessage);
//set to null the foreign key to drop the relation (User one-to-many Messages)
router.delete("/delete-for-user/:messageUUID/:userUUID", messageControllers_1.deleteMessageForUser);
router.delete("/delete-for-all/:messageUUID", messageControllers_1.deleteMessageForAll);
exports.default = router;

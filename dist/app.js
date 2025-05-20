"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("./middlewares/errorHandler");
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const auth_1 = require("./middlewares/auth");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const userControllers_1 = require("./controllers/userControllers");
const searchControllers_1 = require("./controllers/searchControllers");
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/");
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});
const whitelist = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const maxSize = 10000000;
exports.upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
        if (!whitelist.includes(file.mimetype)) {
            return cb(new Error("file is not allowed"));
        }
        cb(null, true);
    },
});
const app = (0, express_1.default)();
const corsOptions = {
    origin: ["https://idyllic-marzipan-b90e38.netlify.app"],
    credentials: true,
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.static("public"));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use("/api/auth", authRoutes_1.default);
app.use(auth_1.auth);
app.use("/api/users", userRoutes_1.default);
app.put("/api/users/:userUUID", exports.upload.single("profile_picture"), userControllers_1.editUser);
app.use("/api/chats", chatRoutes_1.default);
app.use("/api/messages", messageRoutes_1.default);
app.get("/api/search/:userUUID", searchControllers_1.search);
app.use(errorHandler_1.errorHandler);
exports.default = app;

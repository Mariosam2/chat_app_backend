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
exports.deleteUser = exports.editUser = exports.getMessageUsers = exports.getChatUsers = exports.getUserData = exports.getLoggedInUser = void 0;
const helpers_1 = require("./helpers");
const client_1 = require("../../client");
const http_errors_1 = __importDefault(require("http-errors"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const validator_1 = __importDefault(require("validator"));
const library_1 = require("../../client/runtime/library");
const prisma = new client_1.PrismaClient();
const getLoggedInUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        //console.log(req.user);
        if (!(0, helpers_1.validateUUIDS)(req.user)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const authUserUUID = req.user;
        //get the user uuid from
        const authUser = yield prisma.user.findUniqueOrThrow({
            where: {
                uuid: authUserUUID,
            },
            select: {
                uuid: true,
                username: true,
                profile_picture: true,
            },
        });
        res.status(200).json({
            success: true,
            authUser: authUser,
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_a = err.meta) === null || _a === void 0 ? void 0 : _a.modelName) === "string") {
                throw (0, http_errors_1.default)(404, ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName.toLowerCase()) + " " + "not found");
            }
        }
        next(err);
    }
});
exports.getLoggedInUser = getLoggedInUser;
const getUserData = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.userUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { userUUID } = req.params;
        const userData = yield prisma.user.findUniqueOrThrow({
            where: {
                uuid: userUUID,
            },
            select: {
                username: true,
                profile_picture: true,
            },
        });
        res.status(200).json({
            success: true,
            user: userData,
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName) === "string") {
                throw (0, http_errors_1.default)(404, err.meta.modelName.toLowerCase() + " " + "not found");
            }
        }
        next(err);
    }
});
exports.getUserData = getUserData;
const getChatUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.chatUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { chatUUID } = req.params;
        const chatUsers = yield prisma.chat.findUniqueOrThrow({
            where: {
                uuid: chatUUID,
            },
            select: {
                users: { select: { user_id: true } },
            },
        });
        const chatUsersIds = chatUsers.users.map((user) => user.user_id);
        const chatUsersData = yield prisma.user.findMany({
            where: {
                id: { in: chatUsersIds },
            },
            select: {
                uuid: true,
            },
        });
        res.status(200).json({
            success: true,
            users: chatUsersData.map((user) => user.uuid),
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName) === "string") {
                throw (0, http_errors_1.default)(404, err.meta.modelName.toLowerCase() + " " + "not found");
            }
        }
        next(err);
    }
});
exports.getChatUsers = getChatUsers;
const getMessageUsers = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.messageUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { messageUUID } = req.params;
        const messageUsers = yield prisma.message.findUniqueOrThrow({
            where: {
                uuid: messageUUID,
            },
            select: {
                sender: { select: { uuid: true } },
                receiver: { select: { uuid: true } },
            },
        });
        res.status(200).json({
            success: true,
            users: messageUsers,
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName) === "string") {
                throw (0, http_errors_1.default)(404, err.meta.modelName.toLowerCase() + " " + "not found");
            }
        }
        next(err);
    }
});
exports.getMessageUsers = getMessageUsers;
const isEditableUser = (obj) => {
    return ((typeof obj.username === "string" ||
        typeof obj.username === null) &&
        typeof obj.path === "string" &&
        typeof obj.password === "string" &&
        typeof obj.confirm_password === "string");
};
const validateUpdateReq = (obj, req) => {
    if (obj.username.trim() === "" &&
        obj.path.trim() === "" &&
        obj.password.trim() === "" &&
        obj.confirm_password.trim() === "") {
        req.invalidField = "all";
        throw (0, http_errors_1.default)(400, "Change at least one field");
    }
    if (obj.password !== obj.confirm_password) {
        req.invalidField = "password";
        throw (0, http_errors_1.default)(400, "passwords don't match");
    }
    if (obj.username && obj.username.length < 3) {
        req.invalidField = "username";
        throw (0, http_errors_1.default)(400, "Username must be at least 3 characters long");
    }
    if (obj.password && !validator_1.default.isStrongPassword(obj.password)) {
        req.invalidField = "password";
        throw (0, http_errors_1.default)(400, "Password must be at least of 8 characters with one lowercase, one uppercase, one number and one symbol");
    }
};
const editUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        //console.log(req.file, req.body);
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.userUUID)) {
            throw (0, http_errors_1.default)(400, "Invalid user UUID");
        }
        if (!isEditableUser(req.body)) {
            throw (0, http_errors_1.default)(400, "Invalid request body format");
        }
        validateUpdateReq(req.body, req);
        const { userUUID } = req.params;
        const _c = req.body, { confirm_password, password, username, path } = _c, rest = __rest(_c, ["confirm_password", "password", "username", "path"]);
        const editableUserData = Object.assign({}, rest);
        if (username.trim() !== "") {
            editableUserData.username = username;
        }
        if (password.trim() !== "") {
            const hashedPassword = yield bcrypt_1.default.hash(password.trim(), 10);
            editableUserData.password = hashedPassword;
        }
        //console.log(path.trim() !== "");
        if (path.trim() !== "") {
            editableUserData.profile_picture = "/images/" + path.trim();
        }
        //console.log(editableUserData);
        const editedUser = yield prisma.user.update({
            where: {
                uuid: userUUID,
            },
            data: editableUserData,
        });
        res.status(200).json({
            success: true,
            message: "user edited successfully",
            user: {
                uuid: editedUser === null || editedUser === void 0 ? void 0 : editedUser.uuid,
                username: editedUser.username,
                email: editedUser.email,
                profile_picture: editedUser.profile_picture,
            },
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName) === "string") {
                throw (0, http_errors_1.default)(404, err.meta.modelName.toLowerCase() + " " + "not found");
            }
            if (err.code === "P2002") {
                req.invalidField = "username";
                throw (0, http_errors_1.default)(400, "Username is already taken");
            }
        }
        next(err);
    }
});
exports.editUser = editUser;
const deleteUser = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    //TODO: delete chat relations and messages relations
    try {
        if (!(0, helpers_1.validateUUIDS)((_a = req.params) === null || _a === void 0 ? void 0 : _a.userUUID)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { userUUID } = req.params;
        yield prisma.user.update({
            where: {
                uuid: userUUID,
            },
            data: { deleted_at: new Date() },
        });
    }
    catch (err) {
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName) === "string") {
                throw (0, http_errors_1.default)(404, err.meta.modelName.toLowerCase() + " " + "not found");
            }
        }
        next(err);
    }
});
exports.deleteUser = deleteUser;

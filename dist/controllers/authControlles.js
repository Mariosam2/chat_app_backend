"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.logout = exports.refreshToken = exports.login = exports.register = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const validator = __importStar(require("validator"));
const client_1 = require("../../client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const helpers_1 = require("./helpers");
const library_1 = require("../../client/runtime/library");
const prisma = new client_1.PrismaClient();
const isRegisterPayload = (obj) => {
    return (typeof obj.username === "string" &&
        typeof obj.email === "string" &&
        typeof obj.password === "string" &&
        typeof obj.confirm_password === "string");
};
//check only if the email is an email,
//for username and email unique constraint I'll catch P2002 prisma error
const validateRegister = (obj, req) => __awaiter(void 0, void 0, void 0, function* () {
    if (obj.email.trim() === "" &&
        obj.username.trim() === "" &&
        obj.password.trim() === "" &&
        obj.confirm_password.trim() === "") {
        throw (0, http_errors_1.default)(400, "Please  fill the inputs");
    }
    if (obj.username && obj.username.length < 3) {
        req.invalidField = "username";
        throw (0, http_errors_1.default)(400, "Username must be at least 3 characters long");
    }
    if (!validator.isEmail(obj.email)) {
        req.invalidField = "email";
        throw (0, http_errors_1.default)(400, "enter a valid email (ex: example@mail.com)");
    }
    if (obj.password !== obj.confirm_password) {
        req.invalidField = "password";
        throw (0, http_errors_1.default)(400, "passwords are not equal");
    }
    if (!validator.isStrongPassword(obj.password)) {
        req.invalidField = "password";
        throw (0, http_errors_1.default)(400, "Password must be at least of 8 characters with one lowercase, one uppercase, one number and one symbol");
    }
    const { confirm_password, password } = obj, rest = __rest(obj, ["confirm_password", "password"]);
    const hashedPassword = yield bcrypt_1.default.hash(password, 12);
    const newUser = Object.assign(Object.assign({}, rest), { password: hashedPassword, deleted_at: null });
    return newUser;
});
const register = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        if (!isRegisterPayload(req.body)) {
            throw (0, http_errors_1.default)(400, "invalid request payload");
        }
        const registerPayload = req.body;
        const newUser = yield validateRegister(registerPayload, req);
        yield prisma.user.create({
            data: newUser,
        });
        res.status(200).json({
            success: true,
            message: "user registered successfully",
        });
    }
    catch (err) {
        //console.log(err);
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2002") {
                if (((_a = err.meta) === null || _a === void 0 ? void 0 : _a.target) === "users_email_key") {
                    req.invalidField = "email";
                    throw (0, http_errors_1.default)(409, "email already taken");
                }
                if (((_b = err.meta) === null || _b === void 0 ? void 0 : _b.target) === "users_username_key")
                    req.invalidField = "username";
                throw (0, http_errors_1.default)(409, "username already taken");
            }
        }
        if (err instanceof library_1.PrismaClientInitializationError) {
            throw (0, http_errors_1.default)(500, "Internal server error");
        }
        next(err);
    }
});
exports.register = register;
const isLoginPayload = (obj) => {
    if (obj) {
        return (typeof obj.email === "string" &&
            typeof obj.password === "string");
    }
    return false;
};
const login = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        //console.log(req.body);
        if (!isLoginPayload(req.body)) {
            throw (0, http_errors_1.default)(400, "bad request");
        }
        const { email: userEmail, password: userPassword } = req.body;
        //validate the email
        if (userEmail !== null && !validator.isEmail(userEmail)) {
            req.invalidField = "email";
            throw (0, http_errors_1.default)(400, "enter a valid email (ex: example@mail.com)");
        }
        if (userPassword.trim() === "") {
            req.invalidField = "password";
            throw (0, http_errors_1.default)(400, "please fill the password input");
        }
        const authUser = yield prisma.user.findFirstOrThrow({
            where: {
                email: userEmail,
                deleted_at: null,
            },
        });
        //check if password is correct
        const isPasswordCorrect = yield bcrypt_1.default.compare(userPassword, authUser.password);
        if (!isPasswordCorrect) {
            throw (0, http_errors_1.default)(401, "wrong credentials");
        }
        //generate a token and give it to the client
        const token = jsonwebtoken_1.default.sign({ user_uuid: authUser.uuid }, (0, helpers_1.getEnvOrThrow)("JWT_SECRET_KEY"), { expiresIn: 15 * 60 });
        const refreshToken = jsonwebtoken_1.default.sign({ user_uuid: authUser.uuid }, (0, helpers_1.getEnvOrThrow)("JWT_SECRET_KEY"), { expiresIn: "7d" });
        //set a cookie in the client browser with a longer expiration (refresh token)
        res.cookie("REFRESH_TOKEN", refreshToken, {
            expires: (0, helpers_1.getDateFromNow)(7),
            httpOnly: true,
            sameSite: "none",
            secure: true,
        });
        const { uuid, username, profile_picture } = authUser;
        res.status(200).json({
            success: true,
            token,
            authUser: { uuid, username, profile_picture },
        });
    }
    catch (err) {
        //console.log(err);
        if (err instanceof library_1.PrismaClientKnownRequestError) {
            if (err.code === "P2025" && typeof ((_a = err.meta) === null || _a === void 0 ? void 0 : _a.modelName) === "string") {
                throw (0, http_errors_1.default)(404, ((_b = err.meta) === null || _b === void 0 ? void 0 : _b.modelName.toLowerCase()) + " " + "not found");
            }
        }
        if (err instanceof library_1.PrismaClientInitializationError) {
            throw (0, http_errors_1.default)(500, "Internal server error");
        }
        next(err);
    }
});
exports.login = login;
const refreshToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refreshToken = req.cookies["REFRESH_TOKEN"];
        const decodedUser = jsonwebtoken_1.default.verify(refreshToken, (0, helpers_1.getEnvOrThrow)("JWT_SECRET_KEY"));
        //todo if refresh token expires, logout the user
        if (typeof decodedUser === "object") {
            const tokenUser = yield prisma.user.findUnique({
                where: {
                    uuid: decodedUser.user_uuid,
                },
            });
            if (!tokenUser) {
                res.clearCookie("REFRESH_TOKEN");
                throw (0, http_errors_1.default)(404, "user not found");
            }
            //if refresh token is verified, sign a new access token and serve it
            const refreshedAccessToken = jsonwebtoken_1.default.sign({ user_uuid: decodedUser.user_uuid }, (0, helpers_1.getEnvOrThrow)("JWT_SECRET_KEY"), { expiresIn: 15 * 60 });
            const newRefreshToken = jsonwebtoken_1.default.sign({ user_uuid: decodedUser.user_uuid }, (0, helpers_1.getEnvOrThrow)("JWT_SECRET_KEY"), { expiresIn: "7d" });
            res.cookie("REFRESH_TOKEN", newRefreshToken, {
                expires: (0, helpers_1.getDateFromNow)(7),
                httpOnly: true,
                sameSite: "none",
                secure: true,
            });
            res.status(200).json({
                success: true,
                token: refreshedAccessToken,
                message: "token refreshed",
            });
        }
    }
    catch (err) {
        throw (0, http_errors_1.default)(401, "Unauthorized");
    }
});
exports.refreshToken = refreshToken;
const logout = (req, res, next) => {
    try {
        res.clearCookie("REFRESH_TOKEN");
        res.status(200).json({
            success: true,
            message: "user logged out",
        });
    }
    catch (err) {
        next(err);
    }
};
exports.logout = logout;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const http_errors_1 = __importDefault(require("http-errors"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const helpers_1 = require("../controllers/helpers");
const auth = (req, res, next) => {
    var _a;
    try {
        //console.log(req.header("Authorization"));
        if (!req.header("Authorization")) {
            throw (0, http_errors_1.default)(401, "Unauthorized");
        }
        const accessToken = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.split(" ")[1];
        jsonwebtoken_1.default.verify(accessToken, (0, helpers_1.getEnvOrThrow)("JWT_SECRET_KEY"), (err, decoded) => {
            if (err) {
                throw (0, http_errors_1.default)(401, "Unauthorized");
            }
            else {
                req.user = decoded.user_uuid;
                next();
            }
        });
        //console.log(decodedUser);
    }
    catch (err) {
        next(err);
    }
};
exports.auth = auth;

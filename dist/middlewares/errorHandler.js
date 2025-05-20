"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const multer_1 = require("multer");
const isAppError = (obj) => {
    return typeof obj.status === "number";
};
const errorHandler = (err, req, res, next) => {
    if (err instanceof multer_1.MulterError) {
        res.status(400).json({
            success: false,
            message: err.message,
        });
    }
    else if (isAppError(err)) {
        const invalidField = req.invalidField;
        res.status(err.status || 500).json({
            success: false,
            invalidField,
            message: err.message || "Internal Server Error",
        });
    }
    else {
        res.status(400).json({
            success: false,
            invalidField: "profile_picture",
            message: err.message,
        });
    }
};
exports.errorHandler = errorHandler;

import express from "express";

import { errorHandler } from "./middlewares/errorHandler";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const app = express();

app.use(express.json());

app.use(errorHandler);

export default app;

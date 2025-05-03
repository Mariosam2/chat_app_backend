import app from "./app";
import { PrismaClient } from "./prisma/client";
const prisma = new PrismaClient();
app.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running on port ${process.env.SERVER_PORT}`);
});

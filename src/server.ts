import app from "./app";
import https from "https";
import fs from "fs";
import path from "path";
const serverOptions = {
  key: fs.readFileSync(path.join(__dirname + "/ssl/server.key")),
  cert: fs.readFileSync(path.join(__dirname + "/ssl/server.crt")),
};

const server = https.createServer(serverOptions, app);

server.listen(process.env.SERVER_PORT, () => {
  console.log(`Server running on port ${process.env.SERVER_PORT}`);
});

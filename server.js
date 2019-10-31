const http = require("http");
const handler = require("./handler");

const port = process.env["PORT"] || 8080;

http
  .createServer(handler)
  .listen(port, () => console.log(`Backend Server is running at ${port}`));

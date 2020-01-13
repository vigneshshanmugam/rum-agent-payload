const http = require("http");
const url = require("url");
const querystring = require("querystring");

const port = process.env["PORT"] || 8080;

http
  .createServer((req, res) => {
    const pathname = url.parse(req.url);
    const { delay } = querystring.parse(pathname.query);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json");
    setTimeout(() => {
      res.end(JSON.stringify({ resp: "test2" }));
    }, delay);
  })
  .listen(port, () => console.log(`Backend Server is running at ${port}`));

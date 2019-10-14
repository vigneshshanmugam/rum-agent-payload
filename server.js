const http = require("http");
const fs = require("fs");
const path = require("path");

let resourceCount = 0;

http
  .createServer(async (req, res) => {
    const pathname = req.url;
    if (pathname === "/index") {
      return fs
        .createReadStream(path.join(__dirname, "index.html"), "utf-8")
        .pipe(res);
    } else if (pathname.endsWith(".js")) {
      ++resourceCount;
      return res.end(`${resourceCount}`);
    } else if (pathname.indexOf("/intake/v2/rum/events") >= 0) {
      let chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const payload = Buffer.concat(chunks);
      console.log("Payload Size", payload.byteLength);

      res.statusCode = 204;
      return res.end();
    }

    res.statusCode = 404;
    res.end("Not Found");
  })
  .listen(8080, () => console.log("Backend Server is running at 8080"));

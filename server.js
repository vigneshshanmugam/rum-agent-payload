const http = require("http");
const fs = require("fs");
const path = require("path");

let resourceCount = 0;
let currentFolder = "/";

http
  .createServer(async (req, res) => {
    const pathname = req.url;

    if (pathname === "/") {
      return fs
        .createReadStream(path.join(__dirname, "index.html"), "utf-8")
        .pipe(res);
    } else if (pathname.endsWith(".js")) {
      res.setHeader("content-type", "text/javascript");
      if (pathname.indexOf("script.js") >= 0) {
        return fs
          .createReadStream(
            path.join(__dirname, currentFolder, "script.js"),
            "utf-8"
          )
          .pipe(res);
      } else if (pathname.indexOf("web_modules") >= 0) {
        return fs
          .createReadStream(path.join(__dirname, pathname), "utf-8")
          .pipe(res);
      }
      ++resourceCount;
      return res.end(`${resourceCount}`);
    } else if (pathname.indexOf("/intake/v2/rum/events") >= 0) {
      let chunks = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const payload = Buffer.concat(chunks);

      const data = {
        message: "Our current payload size is",
        size: payload.byteLength
      };

      return res.end(JSON.stringify(data));
    }
    /**
     * Inside example folders
     */
    currentFolder = pathname;
    return fs
      .createReadStream(path.join(__dirname, pathname, "index.html"), "utf-8")
      .pipe(res);
  })
  .listen(8080, () => console.log("Backend Server is running at 8080"));

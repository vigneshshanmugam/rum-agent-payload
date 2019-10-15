const http = require("http");
const handler = require("serve-handler");

let resourceCount = 0;

http
  .createServer(async (req, res) => {
    const pathname = req.url;

    if (pathname.indexOf("/intake/v2/rum/events") >= 0) {
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

    if (pathname.endsWith(".js") && pathname.indexOf("test") >= 0) {
      ++resourceCount;
      return res.end(`${resourceCount}`);
    }

    return handler(req, res);
  })
  .listen(8080, () => console.log("Backend Server is running at 8080"));

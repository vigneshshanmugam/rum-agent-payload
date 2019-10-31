const handler = require("serve-handler");

let resourceCount = 0;

module.exports = function(req, res) {
  const pathname = req.url;

  if (pathname.indexOf("/intake/v2/rum/events") >= 0) {
    let chunks = [];
    req.on("data", data => {
      chunks.push(data);
    });
    req.on("end", () => {
      const payload = Buffer.concat(chunks);
      chunks = [];
      const data = {
        message: "Our current payload size is",
        size: payload.byteLength
      };
      return res.end(JSON.stringify(data));
    });
  }

  if (pathname.endsWith(".js") && pathname.indexOf("test") >= 0) {
    ++resourceCount;
    res.setHeader("cache-control", "no-cache, no-store, must-revalidate");
    return res.end(`${resourceCount}`);
  }

  return handler(req, res);
};

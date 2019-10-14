import { init, apm } from "../../web_modules/@elastic/apm-rum.js";

init({
  serviceName: "rum-current-payload",
  pageLoadTransactionName: "/current",
  serverUrl: "http://localhost:8080",
  breakdownMetrics: true
});

const apmServer = apm.serviceFactory.getService("ApmServer");
const original = apmServer._postJson;
apmServer._postJson = async function(...args) {
  const [endpoint, payload] = args;

  console.log(payload.length);

  const result = await original.apply(apmServer, args);
  const { message, size } = JSON.parse(result);
  document.body.innerHTML = `
    <h2>${message}: ${size} bytes</h2>
  `;
};

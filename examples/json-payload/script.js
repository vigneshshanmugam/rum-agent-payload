import { init, apm } from "../../web_modules/@elastic/apm-rum.js";
import { pick } from "../../web_modules/lodash-es.js";

init({
  serviceName: "rum-json-payload",
  pageLoadTransactionName: "/json-payload",
  serverUrl: "http://localhost:8080",
  breakdownMetrics: true
});

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

const originalPostJson = apmServer._postJson;
const ndJSONTr = apmServer.ndjsonTransactions;
const originalTrModel = perfMonitoring.createTransactionDataModel;

perfMonitoring.createTransactionDataModel = tr => {
  const payload = originalTrModel.call(perfMonitoring, tr);
  const spans = payload.spans;

  payload.spans = spans.map(span =>
    pick(span, [
      "id",
      "name",
      "type",
      "subType",
      "sync",
      "start",
      "duration",
      "context"
    ])
  );

  return payload;
};

apmServer.ndjsonTransactions = transactions => {
  return transactions.map(tr => {
    let breakdowns = "";
    if (tr.breakdown) {
      breakdowns = apmServer.ndjsonMetricsets(tr.breakdown);
      delete tr.breakdown;
    }

    return JSON.stringify({ transaction: tr }) + "\n" + breakdowns;
  });
};

apmServer._postJson = async function(...args) {
  const [endpoint, payload] = args;
  console.log(payload);
  const result = await originalPostJson.apply(apmServer, args);
  const { message, size } = JSON.parse(result);
  document.body.innerHTML = `
    <h2>${message}: ${size} bytes</h2>
  `;
};

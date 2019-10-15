import { init, apm } from "../web_modules/@elastic/apm-rum.js";

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

const originalCreateTrModel = perfMonitoring.createTransactionDataModel;
const originalPostJson = apmServer._postJson;

export function initApm(name) {
  return init({
    serviceName: name,
    pageLoadTransactionName: name,
    serverUrl: "http://localhost:8080",
    breakdownMetrics: true
  });
}

export function filteredTransactionModel(tr) {
  const payload = originalCreateTrModel.call(perfMonitoring, tr);
  payload.spans = payload.spans.map(
    ({ id, name, type, subType, sync, start, duration, context }) => ({
      id,
      name,
      type,
      subType,
      sync,
      start,
      duration,
      context
    })
  );
  return payload;
}

export function jsonTransactions(transactions) {
  return transactions.map(tr => {
    let breakdowns = "";
    if (tr.breakdown) {
      breakdowns = apmServer.ndjsonMetricsets(tr.breakdown);
      delete tr.breakdown;
    }
    return JSON.stringify({ transaction: tr }) + "\n" + breakdowns;
  });
}

export async function renderPayloadSize(...args) {
  const result = await originalPostJson.apply(apmServer, args);
  const { message, size } = JSON.parse(result);
  document.body.innerHTML = `
      <h2>${message}: ${size} bytes</h2>
    `;
}

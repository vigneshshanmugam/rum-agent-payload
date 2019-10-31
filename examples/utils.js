import { init, apm } from "../web_modules/@elastic/apm-rum.js";

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

const originalCreateTrModel = perfMonitoring.createTransactionDataModel;
const originalPostJson = apmServer._postJson;

export function initApm(name) {
  return init({
    serviceName: name,
    pageLoadTransactionName: name,
    serverUrl: window.location.origin,
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

export function removeUnncessaryTrFields(tr) {
  const payload = filteredTransactionModel(tr);
  /**
   * Optimize span context
   */
  const filterContext = (name, context) => {
    if (context && context.http.url && name === context.http.url) {
      delete context.http.url;
    }
    return context;
  };

  /**
   * Remove spanCount
   */
  delete payload["span_count"];
  /**
   * Delete transaction marks.navigationTimings
   */
  delete payload.marks.navigationTiming;

  payload.duration = parseInt(payload.duration);

  payload.spans = payload.spans.map(
    ({ id, name, type, subType, start, duration, context }) => ({
      id,
      name,
      type: `${type}.${subType}`,
      start: parseInt(start),
      duration: parseInt(duration),
      context: filterContext(name, context)
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
  const payload = args[1].split("\n");
  const result = await originalPostJson.apply(apmServer, args);
  const { message, size } = JSON.parse(result);
  document.body.innerHTML = `
      <h2>${message}: ${size} bytes</h2>
      <div>
         <h3> Metadata </h2>
          ${payload[0]}
          <h3> Transaction </h2>
          ${payload[1]}
      </div>
    `;
}

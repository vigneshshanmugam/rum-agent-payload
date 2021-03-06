import { init, apm } from "../web_modules/@elastic/apm-rum.js";
import { compress } from "../web_modules/compress-payload.js";

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

const originalCreateTrModel = perfMonitoring.createTransactionDataModel;
const originalPostJson = apmServer._postJson;

export function initApm(name) {
  return init({
    serviceName: name,
    serverUrl: window.location.origin,
    breakdownMetrics: true,
    apiVersion: 3
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
  const payload = args[1];

  const blob = await compress(payload);

  const [metadata, transaction, ...spansAndBreakdown] = args[1].split("\n");
  const result = await originalPostJson.apply(apmServer, args);
  const { message, size } = JSON.parse(result);
  document.body.innerHTML = `
      <h2>${message}: ${size} bytes</h2>
      <h3 style="color: grey">Payload size using Compression Stream: ${blob.size} bytes</h3>
      <div>
         <h3> Metadata </h2>
          ${metadata}
          <h3> Transaction </h2>
          ${transaction}
          <h3> Spans & Breakdowns </h2>
          ${spansAndBreakdown}
      </div>
    `;
}

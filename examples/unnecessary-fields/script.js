import { apm } from "../../web_modules/@elastic/apm-rum.js";
import {
  initApm,
  jsonTransactions,
  renderPayloadSize,
  filteredTransactionModel
} from "../utils.js";

initApm("rum-span-fields");

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

perfMonitoring.createTransactionDataModel = tr => {
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

  console.log(payload);

  return payload;
};
apmServer.ndjsonTransactions = jsonTransactions;
apmServer._postJson = renderPayloadSize;

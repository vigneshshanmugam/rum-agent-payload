import { apm } from "../../web_modules/@elastic/apm-rum.js";
import {
  initApm,
  jsonTransactions,
  renderPayloadSize,
  removeUnncessaryTrFields
} from "../utils.js";

initApm("rum-metricsets");

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

perfMonitoring.createTransactionDataModel = removeUnncessaryTrFields;
apmServer.ndjsonTransactions = transactions => {
  return transactions.map(tr => {
    const breakdowns = tr.breakdown;
    breakdowns.forEach(breakdown => {
      delete breakdown.transaction;
    });
    tr.breakdown = breakdowns;
    return JSON.stringify({ transaction: tr });
  });
};
apmServer._postJson = renderPayloadSize;

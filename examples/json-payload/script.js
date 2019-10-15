import { apm } from "../../web_modules/@elastic/apm-rum.js";
import {
  initApm,
  jsonTransactions,
  renderPayloadSize,
  filteredTransactionModel
} from "../utils.js";

initApm("rum-json-payload");

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

perfMonitoring.createTransactionDataModel = filteredTransactionModel;
apmServer.ndjsonTransactions = jsonTransactions;
apmServer._postJson = renderPayloadSize;

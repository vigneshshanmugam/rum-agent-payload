import { apm } from "../../web_modules/@elastic/apm-rum.js";
import {
  initApm,
  jsonTransactions,
  renderPayloadSize,
  removeUnncessaryTrFields
} from "../utils.js";

initApm("rum-unncessary-fields");

const perfMonitoring = apm.serviceFactory.getService("PerformanceMonitoring");
const apmServer = apm.serviceFactory.getService("ApmServer");

perfMonitoring.createTransactionDataModel = removeUnncessaryTrFields;
apmServer.ndjsonTransactions = jsonTransactions;
apmServer._postJson = renderPayloadSize;

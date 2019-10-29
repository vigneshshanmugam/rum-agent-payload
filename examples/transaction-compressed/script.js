import { apm } from "../../web_modules/@elastic/apm-rum.js";
import {
  initApm,
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
    const compressed = compressTransaction(tr);
    return JSON.stringify({ tr: compressed });
  });
};
apmServer._postJson = renderPayloadSize;

function compressTransaction(transaction) {
  const compressed = {};
  for (const key of Object.keys(transaction)) {
    const value = transaction[key];
    switch (key) {
      case "trace_id":
        compressed["tid"] = value;
        break;
      case "name":
        compressed["n"] = value;
        break;
      case "spans":
        compressed["sp"] = compresSpans(value);
        break;
      case "breakdown":
        compressed["b"] = compressBreakdown(value);
        break;
      case "context":
        compressed["c"] = compresContext(value);
        break;
      case "type":
        compressed["t"] = value;
        break;
      case "marks":
        compressed["m"] = value;
        break;
      case "duration":
        compressed["d"] = value;
        break;
      case "sampled":
        compressed["sa"] = value;
        break;
      default:
        compressed[key] = value;
    }
  }

  console.log("Compressed transaction", compressed);

  return compressed;
}

function compressSpan(span) {
  let newSpan = {};
  for (const key of Object.keys(span)) {
    const value = span[key];
    if (value === undefined) {
      continue;
    }
    switch (key) {
      case "name":
        newSpan["n"] = value;
        break;
      case "type":
        newSpan["t"] = value;
        break;
      case "start":
        newSpan["st"] = value;
        break;
      case "duration":
        newSpan["d"] = value;
        break;
      case "context":
        newSpan["c"] = compresContext(value);
        break;
      default:
        newSpan[key] = value;
    }
  }
  return newSpan;
}

function compresSpans(spans) {
  return spans.map(span => {
    return compressSpan(span);
  });
}

function compresContext(obj) {
  let newObj = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    switch (key) {
      case "page":
        newObj["p"] = {
          u: value["url"],
          r: value["referer"]
        };
        break;
      case "response":
        newObj["rp"] = compressResponse(value);
        break;
      case "request":
        newObj["rq"] = value;
        break;
      case "http":
        newObj["h"] = compressHttp(value);
        break;
      default:
        newObj[key] = value;
    }
  }
  return newObj;
}

function compressHttp(obj) {
  let newObj = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    switch (key) {
      case "response":
        newObj["rp"] = compressResponse(value);
        break;
      default:
        newObj[key] = value;
    }
  }
  return newObj;
}

function compressResponse(obj) {
  let newObj = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    switch (key) {
      case "decoded_body_size":
        newObj["ds"] = value;
        break;
      case "encoded_body_size":
        newObj["es"] = value;
        break;
      case "transfer_size":
        newObj["ts"] = value;
        break;
      default:
        newObj[key] = value;
    }
  }
  return newObj;
}

function compressBreakdown(breakdowns) {
  return breakdowns.map(breakdown => {
    let newBreakdown = {};
    for (const key of Object.keys(breakdown)) {
      const value = breakdown[key];
      switch (key) {
        case "samples":
          newBreakdown["sa"] = compresSamples(value);
          break;
        case "span":
          newBreakdown["sp"] = compressSpan(value);
          break;
        default:
          newBreakdown[key] = value;
      }
    }
    return newBreakdown;
  });
}

function compresSamples(sample) {
  let newSample = {};
  for (const key of Object.keys(sample)) {
    const value = sample[key];
    switch (key) {
      case "transaction.breakdown.count":
        newSample["trbc"] = compressValue(value);
        break;
      case "transaction.duration.count":
        newSample["trdc"] = compressValue(value);
        break;
      case "transaction.duration.sum.us":
        newSample["trds"] = compressValue(value);
        break;
      case "span.self_time.count":
        newSample["spsc"] = compressValue(value);
        break;
      case "span.self_time.sum.us":
        newSample["spss"] = compressValue(value);
        break;
      default:
        newSample[key] = value;
    }
  }
  return newSample;
}

function compressValue({ value }) {
  return { v: parseInt(value) };
}

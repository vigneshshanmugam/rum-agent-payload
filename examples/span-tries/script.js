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
        const optimisedSpans = [];
        const spanMap = {};
        /**
         * Group spanss
         */
        value.forEach(span => {
          const { type } = span;
          if (!spanMap[type]) {
            spanMap[type] = [];
          }
          spanMap[type].push(span);
        });

        Object.keys(spanMap).forEach(key => {
          const spans = spanMap[key];

          const entries = spans.reduce((acc, span) => {
            acc[span.name] = compressSpan(span, true);
            return acc;
          }, {});

          const trie = createTrie(entries);
          optimize(trie);
          optimisedSpans.push({
            [key]: trie
          });
        });
        compressed["sp"] = optimisedSpans;
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

function compressSpan(span, skip = false) {
  let newSpan = {};
  for (const key of Object.keys(span)) {
    const value = span[key];
    if (value === undefined) {
      continue;
    }
    switch (key) {
      case "name":
        if (!skip) {
          newSpan["n"] = value;
        }
        break;
      case "type":
        if (!skip) {
          newSpan["t"] = value;
        }
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

function createTrie(entries) {
  const trie = {};

  for (let url in entries) {
    let value = entries[url];
    let letters = url.split("");
    let cur = trie;

    for (let i = 0; i < letters.length; i++) {
      let letter = letters[i];
      let node = cur[letter];

      if (typeof node === "undefined") {
        cur = cur[letter] = i === letters.length - 1 ? value : {};
      } else {
        cur = cur[letter];
      }
    }
  }
  return trie;
}

function optimize(cur) {
  var num = 0;

  for (var node in cur) {
    if (typeof cur[node] === "object") {
      var ret = optimize(cur[node]);
      if (ret) {
        delete cur[node];
        node = node + ret.name;
        cur[node] = ret.value;
      }
    }
    num++;
  }

  if (num === 1) {
    return { name: node, value: cur[node] };
  }
}

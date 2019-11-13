import { apm } from "../../web_modules/@elastic/apm-rum.js";
import { initApm, renderPayloadSize } from "../utils.js";

initApm("shortening-fields");

const apmServer = apm.serviceFactory.getService("ApmServer");
apmServer.ndjsonTransactions = transactions => {
  return transactions.map(tr => {
    let spans = "";
    if (tr.spans) {
      spans = compressSpans(tr.spans)
        .map(span => JSON.stringify({ s: span }) + "\n")
        .join("");
      delete tr.spans;
    }
    let breakdowns = "";
    if (tr.breakdown) {
      let compressedBreakdown = compressBreakdown(tr.breakdown);
      breakdowns = compressedBreakdown
        .map(breakdown => JSON.stringify({ m: breakdown }) + "\n")
        .join("");
      delete tr.breakdown;
    }

    const compressed = compressTransaction(tr);
    console.log("Compressed Transaction", compressed);

    return JSON.stringify({ t: compressed }) + "\n" + spans + breakdowns;
  });
};

apmServer._postJson = renderPayloadSize;

function compressTransaction(transaction) {
  const compressed = {};
  for (const key of Object.keys(transaction)) {
    const value = transaction[key];
    switch (key) {
      case "trace_id":
        compressed["trid"] = value;
        break;
      case "name":
        compressed["n"] = value;
        break;
      case "spans":
        compressed["sp"] = compressSpans(value);
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
        compressed["m"] = compressMarks(value);
        break;
      case "duration":
        compressed["d"] = value;
        break;
      case "sampled":
        compressed["sa"] = value;
        break;
      case "span_count":
        const started = value.started;
        compressed["sc"] = {
          s: started
        };
        break;
      default:
        compressed[key] = value;
    }
  }

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
      case "transaction_id":
        newSpan["tid"] = value;
        break;
      case "parent_id":
        newSpan["pid"] = value;
        break;
      case "trace_id":
        newSpan["trid"] = value;
        break;
      case "type":
        newSpan["t"] = value;
        break;
      case "subType":
        newSpan["su"] = value;
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

function compressSpans(spans) {
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
        case "transaction":
          newBreakdown["t"] = compressTransaction(value);
          break;
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
        newSample["trbc"] = value;
        break;
      case "transaction.duration.count":
        newSample["trdc"] = value;
        break;
      case "transaction.duration.sum.us":
        newSample["trds"] = value;
        break;
      case "span.self_time.count":
        newSample["spsc"] = value;
        break;
      case "span.self_time.sum.us":
        newSample["spss"] = value;
        break;
      default:
        newSample[key] = value;
    }
  }
  return newSample;
}

function compressMarks(marks) {
  const agentMarks = marks.agent;
  let newMarks = {};
  for (const key of Object.keys(agentMarks)) {
    const value = agentMarks[key];
    switch (key) {
      case "domComplete":
        newMarks["dc"] = value;
        break;
      case "domInteractive":
        newMarks["di"] = value;
        break;
      case "timeToFirstByte":
        newMarks["ttfb"] = value;
        break;
      case "firstContentfulPaint":
        newMarks["fcp"] = value;
        break;
      default:
        newMarks[key] = value;
    }
  }
  return {
    a: newMarks
  };
}

function compressValue({ value }) {
  return { v: parseInt(value) };
}

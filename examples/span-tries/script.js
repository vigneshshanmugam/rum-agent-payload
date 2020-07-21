import { apm } from "../../web_modules/@elastic/apm-rum.js";
import { initApm, renderPayloadSize } from "../utils.js";

initApm("rum-metricsets");

const apmServer = apm.serviceFactory.getService("ApmServer");

apmServer.ndjsonTransactions = (transactions, compress) => {
  return transactions.map(tr => {
    return JSON.stringify({ x: compressTransaction(tr) });
  });
};

apmServer._postJson = renderPayloadSize;

function compressResponse(response) {
  return {
    ts: response.transfer_size,
    ebs: response.encoded_body_size,
    dbs: response.decoded_body_size
  };
}

function compressHTTP(http) {
  const compressed = {};
  const { method, status_code, url, response } = http;

  compressed.url = url;
  if (method) {
    compressed.mt = method;
  }
  if (status_code) {
    compressed.sc = status_code;
  }
  if (response) {
    compressed.r = compressResponse(response);
  }

  return compressed;
}

function compressContext(context) {
  if (!context) {
    return null;
  }
  const compressed = {};
  const { page, http, response, destination, user, custom } = context;

  if (page) {
    compressed.p = {
      rf: page.referer,
      url: page.url
    };
  }
  if (http) {
    compressed.h = compressHTTP(http);
  }
  if (response) {
    compressed.r = compressResponse(response);
  }
  if (destination) {
    const { service } = destination;
    compressed.dt = {
      se: {
        n: service.name,
        t: service.type,
        rc: service.resource
      },
      ad: destination.address,
      po: destination.port
    };
  }
  if (user) {
    compressed.u = {
      id: user.id,
      un: user.username,
      em: user.email
    };
  }
  if (custom) {
    compressed.cu = custom;
  }

  return compressed;
}

const NAVIGATION_TIMING_MARKS = [
  "fetchStart",
  "domainLookupStart",
  "domainLookupEnd",
  "connectStart",
  "connectEnd",
  "requestStart",
  "responseStart",
  "responseEnd",
  "domLoading",
  "domInteractive",
  "domContentLoadedEventStart",
  "domContentLoadedEventEnd",
  "domComplete",
  "loadEventStart",
  "loadEventEnd"
];

const COMPRESSED_NAV_TIMING_MARKS = [
  "fs",
  "ls",
  "le",
  "cs",
  "ce",
  "qs",
  "rs",
  "re",
  "dl",
  "di",
  "ds",
  "de",
  "dc",
  "es",
  "ee"
];

function compressMarks(marks) {
  if (!marks) {
    return null;
  }
  const { navigationTiming, agent } = marks;
  const compressed = { nt: {} };

  COMPRESSED_NAV_TIMING_MARKS.forEach((mark, index) => {
    const mapping = NAVIGATION_TIMING_MARKS[index];
    compressed.nt[mark] = navigationTiming[mapping];
  });

  compressed.a = {
    fb: compressed.nt.rs,
    di: compressed.nt.di,
    dc: compressed.nt.dc
  };
  const fp = agent.firstContentfulPaint;
  const lp = agent.largestContentfulPaint;
  if (fp) {
    compressed.a.fp = fp;
  }
  if (lp) {
    compressed.a.lp = lp;
  }

  return compressed;
}

function compressMetricsets(breakdowns) {
  return breakdowns.map(({ span, samples }) => {
    const isSpan = span != null;
    if (isSpan) {
      return {
        y: { t: span.type },
        sa: {
          ysc: {
            v: samples["span.self_time.count"].value
          },
          yss: {
            v: samples["span.self_time.sum.us"].value
          }
        }
      };
    }
    return {
      sa: {
        xdc: {
          v: samples["transaction.duration.count"].value
        },
        xds: {
          v: samples["transaction.duration.sum.us"].value
        },
        xbc: {
          v: samples["transaction.breakdown.count"].value
        }
      }
    };
  });
}

function compressTransaction(transaction) {
  /**
   * Group spans
   */
  const optimisedSpans = [];
  const spanMap = {};

  transaction.spans.forEach(span => {
    const { type } = span;
    if (!spanMap[type]) {
      spanMap[type] = [];
    }
    spanMap[type].push(span);
  });

  Object.keys(spanMap).forEach(key => {
    const spans = spanMap[key];
    const entries = spans.reduce((acc, span) => {
      acc[span.name] = compressSpan(span, transaction);
      return acc;
    }, {});

    const trie = createTrie(entries);
    optimize(trie);
    optimisedSpans.push({
      [key]: trie
    });
  });

  const compressed = {
    id: transaction.id,
    tid: transaction.trace_id,
    n: transaction.name,
    t: transaction.type,
    d: transaction.duration,
    c: compressContext(transaction.context),
    m: compressMarks(transaction.marks),
    me: compressMetricsets(transaction.breakdown),
    y: optimisedSpans,
    yc: {
      sd: transaction.spans.length
    },
    sm: transaction.sampled
  };

  console.log(compressed);
  return compressed;
}

function compressSpan(span, transaction) {
  const spanData = {
    id: span.id,
    // n: span.name,
    // t: span.type,
    s: span.start,
    d: span.duration,
    c: compressContext(span.context)
  };

  if (span.parent_id !== transaction.id) {
    spanData.pid = span.parent_id;
  }
  if (span.sync === true) {
    spanData.sy = true;
  }
  if (span.subtype) {
    spanData.su = span.subtype;
  }
  if (span.action) {
    spanData.ac = span.action;
  }
  return spanData;
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

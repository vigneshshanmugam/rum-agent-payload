import { apm } from "../../web_modules/@elastic/apm-rum.js";
import { initApm, renderPayloadSize } from "../utils.js";

initApm("rum-current-payload");

const apmServer = apm.serviceFactory.getService("ApmServer");
apmServer._postJson = renderPayloadSize;

const fs = require('node:fs');
const original = fs.appendFileSync;
const old = "/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/e-digest/retention-disabled-observations.jsonl";
const target = "/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/e-digest/correction-e02/retention-disabled-green-observations.jsonl";
fs.appendFileSync = function(file, ...rest) { return original.call(this, file === old ? target : file, ...rest); };
require('node:module').syncBuiltinESMExports();
require("/home/nikolas/Documents/CODE/MINION/audits/2026-10-23-agent-harness-batches/verification/e-digest/network-deny.cjs");

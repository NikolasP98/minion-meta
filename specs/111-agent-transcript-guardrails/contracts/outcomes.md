# Correction contracts

| Finding | Required observable result | Required negative/control cases |
| --- | --- | --- |
| F1 | JWT-only unpaired node is rejected before trusted node methods; authorized operator remains usable | Unassigned agent/session attempt denied; legitimate paired/shared-auth node remains valid |
| F2 | Earlier extraction cannot erase protocol-invalid status and leave a success receipt | Non-personal and streaming/final paths; ordinary clean output unchanged |
| F3 | LINE quick replies and directive-only interactions survive as channel metadata | TTS off/on, visible/spoken text clean, media/control and nonterminal preservation |
| F4 | Complete supported secrets are removed before truncation and after transformations | Quoted assignment spanning the cap, native persisted result, large ordinary output and valid IDs/receipts |
| F6 | Invalid whole response prevents a clean spoken override announcing success | Invalid visible+clean override, valid override, tagged/always/off speech and generated summary paths |

No new public wire frame or schema is required. Use existing response/authorization contracts. Production testability remains governed by the separate bounded verification plan.

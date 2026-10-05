# Previous findings and current disposition

| Previous finding | Current source/merge evidence | Deployment/runtime evidence | Current action |
|---|---|---|---|
| Attachment linked-record authority and durable deletion | Hub PR272, commit096756e0; `attachments.lifecycle.sql.integration.test.ts` and authority service/route coverage are in master7ac3bfd | The recon deployment API identified7ac3bfd as deployed; no new authenticated B2/erasure test was performed | Do not reopen the source defect. Preserve independent storage/runtime qualification. |
| Attachment link/sweeper deletion races | Hub PR274, commit1a799f6e; two-layer trash/claim lifecycle is in master7ac3bfd | A deployed SHA containing source is not a proof of provider deletion or retention timing | Qualify storage lifecycle independently; avoid duplicate implementation. |
| Booking postcommit stock effects | Remains HS-021 in the97-finding register; historical preparation is not current-master implementation | No new deployment/runtime receipt | Implement transactional durable intent and recovery with concurrency/restart evidence. |
| Old360 completion percentages | Historical89plans/229tasks/51requirements include private and preparatory artifacts | Not a current app/runtime denominator | Preserve the historical table. Track this program's97findings separately with source, tests, review and release states. |

The commit ancestry check used the current isolated Hub checkout, not proposal status or conversational memory. The October2 recon's detailed16-item meta reconciliation is retained with its immutable audit evidence. No previous requirement or release is closed by rewriting this state file.

// Native emitted-module qualification only; never imports the CLI or normal config.
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
if (process.execArgv.length || process.env.NODE_OPTIONS) throw Error('runtime flags are forbidden');
const probe = new DatabaseSync(':memory:');
const sqlite = probe.prepare('select sqlite_version() as version').get().version;
probe.close();
const { RunJournal } = await import(pathToFileURL(process.argv[2]).href);
const dir = mkdtempSync(join(tmpdir(), 'shell-journal-emitted-'));
const limits = { identifierBytes:128, textBytes:256, recordBytes:2048 };
const options = {path:join(dir,'journal.sqlite'),shellId:'shell',maxRuns:1,maxOutcomeBytes:1024,limits};
const admission = {version:1,shellId:'shell',runId:'run',sessionId:'session',invocationId:'invoke',inputDigest:'a'.repeat(64),startedAt:1};
const digest = createHash('sha256').update(JSON.stringify(['minion.shells.outcome',1,'shell','run','session','invoke','a'.repeat(64),'event','final',2,null,null])).digest('hex');
const outcome = {version:1,shellId:'shell',runId:'run',sessionId:'session',invocationId:'invoke',inputDigest:'a'.repeat(64),eventId:'event',state:'final',durationMs:2,outcomeDigest:digest};
let journal;
try {
 journal=new RunJournal(options); if(!journal.admitForDispatch(admission).fresh) throw Error('missing fresh insertion');
 if(journal.admitForDispatch(admission).fresh) throw Error('replayed dispatch permission');
 journal.commitOutcome(outcome); journal.close();
 journal=new RunJournal(options); if(journal.pending().length!==1 || journal.admitForDispatch(admission).fresh) throw Error('missing outcome or replayed permission');
 journal.acknowledge({version:1,shellId:'shell',runId:'run',eventId:'event',outcomeDigest:digest,receiptId:'receipt',committedAt:3}); journal.close();
 journal=new RunJournal(options); if(journal.pending().length!==0 || !journal.inspect('run').outcome) throw Error('missing receipt/tombstone');
 console.log(JSON.stringify({runtime:process.version,execPath:process.execPath,execArgv:process.execArgv,sqlite,reopened:true,acknowledged:true}));
} finally { journal?.close(); rmSync(dir,{recursive:true,force:true}); }

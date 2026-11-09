import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],at=(p:string)=>pathToFileURL(path.join(root,p)).href;
await import(at('src/plugins/runtime.ts'));
const {positiveFixture}=await import(at('extensions/alert-watcher/src/work-test-fixtures.ts'));
const {drainDeliveryReceipts}=await import(at('extensions/alert-watcher/src/delivery-bridge.ts'));
const {enqueueDelivery,checkpointQueuedPayload}=await import(at('src/infra/outbound/delivery-queue-store.ts'));
const {acquireDeliveryEntryLease,releaseDeliveryQueueLease,readQueuedDelivery}=await import(at('src/infra/outbound/delivery-queue-files.ts'));
const {snapshotHash}=await import(at('extensions/alert-watcher/src/provenance.ts'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'astra-suppressed-delivery-'));
const f=positiveFixture(dir);
try {
 const row=f.db.prepare('SELECT * FROM alert_delivery_receipts').get();
 f.db.prepare("UPDATE alert_delivery_receipts SET state='admitted',admitted_at=? WHERE id=?").run(Date.now(),row.id);
 await enqueueDelivery({id:row.id,channel:'telegram',to:'owner',accountId:'default',payloads:JSON.parse(row.payload_json),completionPolicy:'caller',callerRetention:{version:1,owner:'alert-watcher',namespaceHash:snapshotHash('namespace'),receiptId:row.id,payloadHash:row.payload_hash,recipientHash:row.recipient_hash,expiresAt:row.payload_expires_at}},dir);
 const lease=await acquireDeliveryEntryLease(row.id,dir),entry=await readQueuedDelivery(row.id,dir);
 await checkpointQueuedPayload({id:row.id,payloadId:entry.payloads[0].id,expectedGeneration:entry.generation,nextState:'suppressed',lease,stateDir:dir});
 await releaseDeliveryQueueLease(lease);
 let calls=0;
 await drainDeliveryReceipts(f.db,{stateDir:dir,config:()=>({}),authority:async()=>f.snapshot.authority,destinations:()=>f.snapshot.destinations,send:async()=>{calls++;throw Error('must not send');}});
 const result=f.db.prepare('SELECT state,safe_reason,next_attempt_at FROM alert_delivery_receipts').get();
 console.log(JSON.stringify({providerCalls:calls,receipt:result,queueState:(await readQueuedDelivery(row.id,dir)).payloads[0].state},null,2));
 assert.ok(['failed','canceled'].includes(result.state),'known suppressed terminal effect must settle a non-sent outcome rather than retry forever');
 assert.equal(calls,0);
} finally {f.db.close();fs.rmSync(dir,{recursive:true,force:true});}

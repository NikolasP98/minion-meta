import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],at=(p:string)=>pathToFileURL(path.join(root,p)).href;
await import(at('src/plugins/runtime.ts'));
const {enqueueDelivery}=await import(at('src/infra/outbound/delivery-queue-store.ts'));
const {acquireDeliveryEntryLease,releaseDeliveryQueueLease,readQueuedDelivery,readDeliveryTombstone,resolveEntryPath,enforceDeliveryRetention,cleanupRetainedQueueFiles}=await import(at('src/infra/outbound/delivery-queue-files.ts'));
const {retentionHash,recipientBinding}=await import(at('src/infra/outbound/delivery-retention.ts'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'astra-backup-retention-'));
try {
 const id=crypto.randomUUID(),payloads=[{text:'private backup body'}],recipient={channel:'telegram',accountId:'default',to:'private-owner'};
 await enqueueDelivery({id,...recipient,payloads,completionPolicy:'caller',callerRetention:{version:1,owner:'alert-watcher',namespaceHash:retentionHash('namespace'),receiptId:id,payloadHash:retentionHash(payloads),recipientHash:recipientBinding(recipient),expiresAt:Date.now()-1}},dir);
 const backup=resolveEntryPath(id,dir)+`.bak-${process.pid}-${crypto.randomUUID()}`;
 fs.copyFileSync(resolveEntryPath(id,dir),backup);
 const lease=await acquireDeliveryEntryLease(id,dir);
 await enforceDeliveryRetention(await readQueuedDelivery(id,dir),lease,dir);
 await releaseDeliveryQueueLease(lease);
 await cleanupRetainedQueueFiles(dir);
 const tombstone=await readDeliveryTombstone(id,dir);
 const retained=fs.existsSync(backup)&&fs.readFileSync(backup,'utf8').includes('private backup body');
 console.log(JSON.stringify({mainFileExists:fs.existsSync(resolveEntryPath(id,dir)),tombstoneReason:tombstone?.reason,backupRetainsPrivateBody:retained},null,2));
 assert.equal(retained,false,'expired receipt cleanup must include surviving queue backup copies under the entry lease');
} finally {fs.rmSync(dir,{recursive:true,force:true});}

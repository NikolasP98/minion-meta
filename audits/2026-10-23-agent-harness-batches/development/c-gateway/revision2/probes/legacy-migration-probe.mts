import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
const root=process.argv[2],at=(p:string)=>pathToFileURL(path.join(root,p)).href;
await import(at('src/plugins/runtime.ts'));
const {initSchema,getRetryablePendingNotifications}=await import(at('extensions/alert-watcher/src/store.ts'));
const {initReplySchema}=await import(at('extensions/alert-watcher/src/reply-flow/store.ts'));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'astra-prechange-migration-')),db=new DatabaseSync(path.join(dir,'alerts.db'));
try {
 db.exec(`CREATE TABLE complaints(id INTEGER PRIMARY KEY AUTOINCREMENT,agent_id TEXT,channel_id TEXT NOT NULL,chat_id TEXT NOT NULL,from_sender TEXT NOT NULL,content TEXT NOT NULL,is_complaint INTEGER NOT NULL DEFAULT 0,severity TEXT NOT NULL DEFAULT 'low',category TEXT NOT NULL DEFAULT 'other',summary TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,notified_at INTEGER,notify_attempts INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE pending_replies(id INTEGER PRIMARY KEY AUTOINCREMENT,alert_id INTEGER NOT NULL REFERENCES complaints(id),origin_channel TEXT NOT NULL,origin_account_id TEXT,origin_chat_id TEXT NOT NULL,destinations_json TEXT NOT NULL,suggestions_json TEXT NOT NULL,language TEXT,expires_at INTEGER NOT NULL,claimed_by TEXT,claimed_at INTEGER,reply_text TEXT,reply_kind TEXT,forwarded_ok INTEGER,created_at INTEGER NOT NULL);
 INSERT INTO complaints(channel_id,chat_id,from_sender,content,is_complaint,summary,created_at) VALUES('telegram','legacy-chat','legacy-sender','legacy-body',1,'legacy-summary',1);
 INSERT INTO pending_replies(alert_id,origin_channel,origin_chat_id,destinations_json,suggestions_json,expires_at,created_at) VALUES(1,'telegram','legacy-chat','["owner"]','["reply"]',9999999999999,1);`);
 assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE name='classification_work'").get().n,0);
 initSchema(db);initReplySchema(db);initSchema(db);initReplySchema(db);
 const old=db.prepare('SELECT id,content,summary,delivery_disposition FROM complaints').get(),reply=db.prepare('SELECT id,destinations_json,suggestions_json,receipt_binding FROM pending_replies').get();
 assert.deepEqual({...old},{id:1,content:'legacy-body',summary:'legacy-summary',delivery_disposition:'legacy_unreconciled'});
 assert.deepEqual({...reply},{id:1,destinations_json:'["owner"]',suggestions_json:'["reply"]',receipt_binding:null});
 assert.deepEqual(getRetryablePendingNotifications(db,3),[]);
 assert.equal(db.prepare('SELECT count(*) n FROM classification_work').get().n,0);
 assert.equal(db.prepare('SELECT count(*) n FROM alert_delivery_receipts').get().n,0);
 console.log(JSON.stringify({preChangeSchema:true,upgradePasses:2,complaintPreserved:true,legacyReplyPreserved:true,legacyAutoFanout:0,inventedWork:0,inventedDeliveryReceipts:0},null,2));
} finally {db.close();fs.rmSync(dir,{recursive:true,force:true});}

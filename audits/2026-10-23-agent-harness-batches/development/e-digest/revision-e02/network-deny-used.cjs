const https = require('node:https');
const http = require('node:http');
const {syncBuiltinESMExports}=require('node:module');
function allowed(input) {
 const host=typeof input==='string'||input instanceof URL ? new URL(input).hostname : input?.hostname??input?.host;
 if(!['127.0.0.1','localhost','[::1]','::1'].includes(host)) throw new Error('Independent E verification denied non-loopback network');
}
https.request=()=>{throw new Error('Independent E verification denied HTTPS before network');};
https.get=https.request;
for(const name of ['request','get']){const original=http[name];http[name]=function(input,...args){allowed(input);return original.call(this,input,...args);};}
const nativeFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{allowed(input instanceof Request?input.url:input);return nativeFetch(input,init);};
syncBuiltinESMExports();

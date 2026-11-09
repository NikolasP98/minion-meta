#!/usr/bin/env python3
"""Exercise actual pinned Claude hook execution against loopback-only stubs."""
import hashlib
import http.server
import json
import os
from pathlib import Path
import subprocess
import shutil
import tempfile
import threading
import time

AUDIT = Path(__file__).parent
SOURCE = Path('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/b-factory')
BINARY = Path('/home/nikolas/.cache/codex-implementation/2026-10-23-agent-harness-batches-7j3rswst/qualification/claude-2.1.233/node_modules/@anthropic-ai/claude-code-linux-x64/claude')
requests = []
message_count = 0
class Stub(http.server.BaseHTTPRequestHandler):
    def log_message(self, *_args):
        pass
    def do_POST(self):
        global message_count
        body = json.loads(self.rfile.read(int(self.headers.get('content-length', '0'))))
        requests.append(dict(path=self.path, monotonic=time.monotonic()))
        if self.path.startswith('/jev/decide'):
            time.sleep(8)
            try:
                self.send_response(200); self.end_headers(); self.wfile.write(b'{}')
            except (BrokenPipeError, ConnectionResetError):
                pass
            return
        if 'count_tokens' in self.path:
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(b'{"input_tokens":10}')
            return
        message_count += 1
        tool = message_count == 1
        content = dict(type='tool_use', id='tool_fixture', name='Bash', input={'command':'printf factory-hook-fixture'}) if tool else dict(type='text', text='Local fixture complete.')
        msg = dict(id=f'msg_fixture_{message_count}',type='message',role='assistant',model='claude-sonnet-4-6',content=[content],stop_reason='tool_use' if tool else 'end_turn',stop_sequence=None,usage={'input_tokens':10,'output_tokens':10})
        if not body.get('stream'):
            self.send_response(200); self.send_header('Content-Type','application/json'); self.end_headers(); self.wfile.write(json.dumps(msg).encode()); return
        self.send_response(200); self.send_header('Content-Type','text/event-stream'); self.end_headers()
        start = dict(msg, content=[], stop_reason=None, usage={'input_tokens':10,'output_tokens':0})
        def event(name, data):
            self.wfile.write(('event: '+name+'\ndata: '+json.dumps(data)+'\n\n').encode()); self.wfile.flush()
        event('message_start',dict(type='message_start',message=start))
        if tool:
            event('content_block_start',dict(type='content_block_start',index=0,content_block=dict(content,input={})))
            event('content_block_delta',dict(type='content_block_delta',index=0,delta=dict(type='input_json_delta',partial_json=json.dumps(content['input']))))
        else:
            event('content_block_start',dict(type='content_block_start',index=0,content_block=dict(type='text',text='')))
            event('content_block_delta',dict(type='content_block_delta',index=0,delta=dict(type='text_delta',text=content['text'])))
        event('content_block_stop',dict(type='content_block_stop',index=0))
        event('message_delta',dict(type='message_delta',delta=dict(stop_reason=msg['stop_reason'],stop_sequence=None),usage=dict(output_tokens=10)))
        event('message_stop',dict(type='message_stop'))

server = http.server.ThreadingHTTPServer(('127.0.0.1',0),Stub)
threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}'
with tempfile.TemporaryDirectory(prefix='factory-pinned-hook-') as scratch:
    scratch=Path(scratch); home=scratch/'home'; out=scratch/'out'; work=scratch/'work'
    for folder in [home,out,work]:folder.mkdir()
    hooks=scratch/'hooks';shutil.copytree(SOURCE/'agent/hooks',hooks);(hooks/'jev-guard.sh').chmod(0o644)
    env = dict(PATH='/usr/bin:/bin',HOME=str(home),CLAUDE_CONFIG_DIR=str(home/'.claude'),
        ANTHROPIC_API_KEY='local-stub-not-a-credential',ANTHROPIC_BASE_URL=url,
        CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC='1',DISABLE_TELEMETRY='1',DISABLE_ERROR_REPORTING='1',DISABLE_AUTOUPDATER='1',
        HTTP_PROXY='http://127.0.0.1:1',HTTPS_PROXY='http://127.0.0.1:1',ALL_PROXY='http://127.0.0.1:1',NO_PROXY='127.0.0.1,localhost',
        FACTORY_JEV_LIB=str(SOURCE/'agent/lib/jev.sh'),FACTORY_JEV_ACCOUNTING_HELPER=str(SOURCE/'agent/lib/jev-accounting.py'),
        FACTORY_OUT_DIR=str(out),FACTORY_JEV_PROXY_URL=url,FACTORY_JEV_CAPABILITY='fjc_local-fixture',FACTORY_JEV_GUARD='shadow')
    command=['bwrap','--ro-bind','/','/','--dev-bind','/dev','/dev','--proc','/proc','--tmpfs','/tmp','--tmpfs','/opt','--ro-bind',str(hooks),'/opt/factory-hooks','--bind',str(scratch),str(scratch),'--chdir',str(work),str(BINARY),'-p','Run the fixture tool once.',
        '--output-format','stream-json','--verbose','--include-hook-events','--max-turns','2','--model','claude-sonnet-4-6','--tools','Bash','--allowedTools','Bash',
        '--settings',str(SOURCE/'agent/hooks/claude-settings.json'),'--setting-sources','','--strict-mcp-config','--mcp-config','{"mcpServers":{}}','--no-session-persistence']
    started=time.monotonic()
    process=subprocess.Popen(command,env=env,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    lines=[];timings=[]
    def collect():
        for line in process.stdout:
            lines.append(line)
            try:
                row=json.loads(line)
                if row.get('subtype') in ('hook_started','hook_response'):
                    timings.append(dict(subtype=row['subtype'],hookId=row.get('hook_id'),monotonic=time.monotonic()))
            except ValueError:pass
    reader=threading.Thread(target=collect);reader.start()
    process.wait(timeout=40);reader.join()
    class Result:pass
    result=Result();result.returncode=process.returncode;result.stdout=''.join(lines);result.stderr=process.stderr.read()
    elapsed=time.monotonic()-started
    (AUDIT/'red-readonly-hook-harness.stdout.jsonl').write_text(result.stdout)
    (AUDIT/'red-readonly-hook-harness.stderr.log').write_text(result.stderr)
    rows=[]
    for line in result.stdout.splitlines():
        try:rows.append(json.loads(line))
        except ValueError:pass
    hookElapsedMs=(timings[-1]['monotonic']-timings[0]['monotonic'])*1000 if len(timings)==2 else None
    receipt=dict(hookElapsedMs=hookElapsedMs,hookTimings=timings,binarySha256=hashlib.sha256(BINARY.read_bytes()).hexdigest(),sourceSettingsSha256=hashlib.sha256((SOURCE/'agent/hooks/claude-settings.json').read_bytes()).hexdigest(),sourceLibrarySha256=hashlib.sha256((SOURCE/'agent/lib/jev.sh').read_bytes()).hexdigest(),sourceAccountingHelperSha256=hashlib.sha256((SOURCE/'agent/lib/jev-accounting.py').read_bytes()).hexdigest(),sourceMode=oct((SOURCE/'agent/hooks/jev-guard.sh').stat().st_mode & 0o777),installedCopyMode=oct((hooks/'jev-guard.sh').stat().st_mode & 0o777),sourceHookSha256=hashlib.sha256((SOURCE/'agent/hooks/jev-guard.sh').read_bytes()).hexdigest(),exitCode=result.returncode,elapsedMs=round(elapsed*1000,2),requests=requests,hookEvents=[r for r in rows if 'hook' in str(r.get('subtype',''))],providerCalls=message_count,jevCalls=sum(r['path'].startswith('/jev/decide') for r in requests),environment='Explicit isolated env; no inherited credentials; loopback provider and proxy; outbound telemetry/update disabled; proxy rejects non-loopback traffic',invocation=command)
    responses=[r for r in rows if r.get('subtype')=='hook_response']
    assert result.returncode==0 and len(responses)==1 and responses[0].get('exit_code')==126, responses
    assert sum(r['path'].startswith('/jev/decide') for r in requests)==0
    receipt['verified']=False
    receipt['redFixtureExpected']=True
    receipt['reason']='Tracked source0644 is not the Docker-installed0555 executable; failed hook is not A09 proof.'
    for file in out.iterdir():
        if file.is_file() and file.name in ('jev-accounting.jsonl','jev-shadow.jsonl'):(AUDIT/('red-readonly-hook-'+file.name)).write_bytes(file.read_bytes())
    (AUDIT/'red-readonly-hook-harness.receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps({k:v for k,v in receipt.items() if k not in ('invocation','hookEvents')},indent=2))
server.shutdown()

# minimal stdio MCP client for figcraft-cli mcp
import json, subprocess, sys, os, itertools
class MCP:
    def __init__(self, args):
        self.p = subprocess.Popen(args, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=sys.stderr, text=True, bufsize=1)
        self.ids = itertools.count(1)
        self.req("initialize", {"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"claude","version":"1"}})
        self.notify("notifications/initialized", {})
    def _send(self, m):
        self.p.stdin.write(json.dumps(m)+"\n"); self.p.stdin.flush()
    def notify(self, method, params): self._send({"jsonrpc":"2.0","method":method,"params":params})
    def req(self, method, params):
        i = next(self.ids); self._send({"jsonrpc":"2.0","id":i,"method":method,"params":params})
        while True:
            line = self.p.stdout.readline()
            if not line: raise RuntimeError("server closed")
            m = json.loads(line)
            if m.get("id") == i:
                if "error" in m: raise RuntimeError(m["error"])
                return m["result"]
    def tool(self, name, **args):
        r = self.req("tools/call", {"name":name,"arguments":args})
        out = "\n".join(c.get("text","") for c in r.get("content",[]) if c.get("type")=="text")
        if r.get("isError"): raise RuntimeError(out)
        return out

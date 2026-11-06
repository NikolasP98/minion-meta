#!/usr/bin/env python3
"""Record a local Gateway validation command without environment secrets."""
import datetime
import json
import os
from pathlib import Path
import subprocess
import sys
import time

proof = Path(__file__).resolve().parent
name, *command = sys.argv[1:]
start = time.time()
record = {
    "at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "cwd": os.getcwd(),
    "argv": command,
    "log": f"{name}.log",
}
with (proof / record["log"]).open("w") as log:
    result = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT)
record.update(exit=result.returncode, seconds=round(time.time() - start, 3))
with (proof / "commands.jsonl").open("a") as ledger:
    ledger.write(json.dumps(record) + "\n")
print(json.dumps(record), flush=True)
sys.exit(result.returncode)

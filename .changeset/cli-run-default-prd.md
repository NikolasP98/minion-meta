---
'@minion-stack/cli': minor
---

`minion run <id> [cmd...] [--prd]` runs a subproject's registered default (`commands.run`, or `commands["run:prd"]` with `--prd`) when no explicit command is given, in both the `run` command and the `minion <id>` alias.

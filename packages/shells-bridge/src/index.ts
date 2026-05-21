#!/usr/bin/env node
// @minion-stack/shells-bridge entrypoint.
//
// Baked into every shell VM image. Started by systemd:
//
//   [Service]
//   ExecStart=/usr/bin/shells-bridge
//   EnvironmentFile=/etc/shells-bridge.env
//   Restart=always
//   RestartSec=5s
//
// Environment (see config.ts for full list):
//   SHELLS_SHELL_ID         — stable shell id
//   SHELLS_GATEWAY_URL      — wss://gateway.../ws
//   SHELLS_DEVICE_TOKEN     — one-time token for shells.register
//   SHELLS_HARNESS          — "hermes" | "claude-code" | "codex" | …
//   SHELLS_HARNESS_VERSION  — version string
//   SHELLS_HARNESS_CMD      — command line spawned to run the harness via ACP
//   SHELLS_HARNESS_WORKDIR  — state dir (default /home/agent/state)
//   SHELLS_BACKUP_TARGET    — optional, e.g. b2://bucket/<shellId>/

import { Bridge } from './bridge.js';
import { loadConfig, ConfigError } from './config.js';

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      process.stderr.write(`[bridge] ${err.message}\n`);
      process.exit(2);
    }
    throw err;
  }

  const bridge = new Bridge(config);

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    process.stderr.write(`[bridge] received ${signal}, shutting down\n`);
    await bridge.shutdown();
    process.exit(0);
  };
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  bridge.start();
}

void main().catch((err: Error) => {
  process.stderr.write(`[bridge] fatal: ${err.message}\n`);
  process.exit(1);
});

export { Bridge } from './bridge.js';
export { loadConfig, ConfigError, type BridgeConfig } from './config.js';

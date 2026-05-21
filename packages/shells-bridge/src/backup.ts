// Backup / restore for shells.
//
// The harness is authoritative for in-VM state (per spec D3), so we tar the
// harness's working directory and stream-upload to the configured remote.
// Today only `b2://bucket/path/` URIs are supported, dispatched via the
// `rclone` binary which is expected to be installed in the baked image and
// configured with a remote named "b2".
//
// Restore is the inverse: download archive → extract into workDir → harness
// is started afterwards by the supervisor.

import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

export interface BackupOptions {
  /** Path on disk to archive. */
  workDir: string;
  /** Remote target (e.g. "b2://minion-shells/<shellId>/"). */
  target: string;
}

export interface BackupResult {
  backupId: string;
  bytes: number;
  uploadMs: number;
  remotePath: string;
}

/** Stream-tar workDir into the backup target. Returns metadata. */
export async function backup(opts: BackupOptions): Promise<BackupResult> {
  const backupId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const remotePath = joinTarget(opts.target, `${backupId}.tar.gz`);
  const started = Date.now();

  // tar czf - <workDir> | rclone rcat <remotePath>
  const tar = spawn('tar', ['czf', '-', '-C', opts.workDir, '.'], { stdio: ['ignore', 'pipe', 'pipe'] });
  const rclone = spawn('rclone', ['rcat', '--progress=false', remotePath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let bytes = 0;
  tar.stdout.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
  });
  tar.stdout.pipe(rclone.stdin);

  const tarStderr = collectStderr(tar);
  const rcloneStderr = collectStderr(rclone);

  const [tarCode, rcloneCode] = await Promise.all([waitExit(tar), waitExit(rclone)]);
  if (tarCode !== 0) throw new Error(`tar exited ${tarCode}: ${tarStderr()}`);
  if (rcloneCode !== 0) throw new Error(`rclone rcat exited ${rcloneCode}: ${rcloneStderr()}`);

  return {
    backupId,
    bytes,
    uploadMs: Date.now() - started,
    remotePath,
  };
}

export interface RestoreOptions {
  /** Where to extract. Bridge typically clears this first. */
  workDir: string;
  /** Full remote path of the archive (e.g. "b2://bucket/<shellId>/<backupId>.tar.gz"). */
  remotePath: string;
}

export async function restore(opts: RestoreOptions): Promise<void> {
  // rclone cat <remotePath> | tar xzf - -C <workDir>
  const rclone = spawn('rclone', ['cat', opts.remotePath], { stdio: ['ignore', 'pipe', 'pipe'] });
  const tar = spawn('tar', ['xzf', '-', '-C', opts.workDir], { stdio: ['pipe', 'pipe', 'pipe'] });
  rclone.stdout.pipe(tar.stdin);

  const rcloneStderr = collectStderr(rclone);
  const tarStderr = collectStderr(tar);

  const [rcloneCode, tarCode] = await Promise.all([waitExit(rclone), waitExit(tar)]);
  if (rcloneCode !== 0) throw new Error(`rclone cat exited ${rcloneCode}: ${rcloneStderr()}`);
  if (tarCode !== 0) throw new Error(`tar exited ${tarCode}: ${tarStderr()}`);
}

function joinTarget(base: string, name: string): string {
  return base.endsWith('/') ? `${base}${name}` : `${base}/${name}`;
}

function waitExit(proc: { on(event: 'exit', listener: (code: number | null) => void): void }): Promise<number> {
  return new Promise((resolve) => {
    proc.on('exit', (code) => resolve(code ?? -1));
  });
}

function collectStderr(proc: { stderr: NodeJS.ReadableStream }): () => string {
  const chunks: Buffer[] = [];
  proc.stderr.on('data', (c: Buffer) => chunks.push(c));
  return () => Buffer.concat(chunks).toString('utf8').slice(0, 2000);
}

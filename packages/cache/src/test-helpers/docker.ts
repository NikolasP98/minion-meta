import { execFileSync } from 'node:child_process';

let cached: boolean | null = null;

export function isDockerAvailable(): boolean {
  if (cached !== null) return cached;
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' });
    cached = true;
  } catch {
    cached = false;
  }
  return cached;
}

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const fail = (message) => {
  throw new Error(message);
};
export function assert(value, message) {
  if (!value) fail(message);
}
export function object(value, required, optional = []) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'expected object');
  for (const key of required) assert(Object.hasOwn(value, key), `missing ${key}`);
  for (const key of Object.keys(value))
    assert([...required, ...optional].includes(key), `unknown field ${key}`);
  return value;
}
export function string(v, name = 'string') {
  assert(typeof v === 'string' && v.length > 0 && v.length <= 4096, `invalid ${name}`);
  return v;
}
export function number(v, min = 0, max = Number.MAX_SAFE_INTEGER) {
  assert(Number.isFinite(v) && v >= min && v <= max, 'invalid number');
  return v;
}
export function integer(v, min = 0, max = Number.MAX_SAFE_INTEGER) {
  number(v, min, max);
  assert(Number.isSafeInteger(v), 'invalid integer');
  return v;
}
export function one(v, values) {
  assert(values.includes(v), `unsupported value ${v}`);
  return v;
}
export function hash(v) {
  assert(typeof v === 'string' && /^[a-f0-9]{64}$/.test(v), 'invalid sha256');
  return v;
}
export function uuid(v) {
  assert(
    typeof v === 'string' &&
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v),
    'invalid uuid',
  );
  return v;
}
export const digest = (v) =>
  crypto
    .createHash('sha256')
    .update(typeof v === 'string' || Buffer.isBuffer(v) ? v : canonical(v))
    .digest('hex');
export function canonical(v) {
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (typeof v === 'number') {
    assert(Number.isFinite(v), 'nonfinite number');
    return JSON.stringify(v);
  }
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  assert(v && typeof v === 'object', 'unsupported JSON value');
  return `{${Object.keys(v)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`)
    .join(',')}}`;
}
// Scan keys before JSON.parse so duplicate-key intent cannot disappear at the boundary.
export function parse(text) {
  assert(Buffer.byteLength(text) <= 16 * 1024 * 1024, 'JSON too large');
  let i = 0;
  const ws = () => {
    while (/\s/.test(text[i] ?? '') && i < text.length) i++;
  };
  function str() {
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') i += 2;
      else if (text[i++] === '"') return JSON.parse(text.slice(start, i));
    }
    fail('invalid JSON string');
  }
  function value() {
    ws();
    if (text[i] === '{') {
      i++;
      ws();
      const keys = new Set();
      if (text[i] === '}') {
        i++;
        return;
      }
      while (i < text.length) {
        assert(text[i] === '"', 'invalid JSON key');
        const k = str();
        assert(!keys.has(k), `duplicate JSON key ${k}`);
        keys.add(k);
        ws();
        assert(text[i++] === ':', 'invalid JSON');
        value();
        ws();
        const c = text[i++];
        if (c === '}') return;
        assert(c === ',', 'invalid JSON');
        ws();
      }
    } else if (text[i] === '[') {
      i++;
      ws();
      if (text[i] === ']') {
        i++;
        return;
      }
      while (i < text.length) {
        value();
        ws();
        const c = text[i++];
        if (c === ']') return;
        assert(c === ',', 'invalid JSON');
      }
    } else if (text[i] === '"') str();
    else {
      const start = i;
      while (i < text.length && !/[\s,\]}]/.test(text[i])) i++;
      assert(i > start, 'invalid JSON');
      JSON.parse(text.slice(start, i));
    }
  }
  value();
  ws();
  assert(i === text.length, 'trailing JSON');
  return JSON.parse(text);
}
export function safePath(p, { existing = true, directory = false } = {}) {
  assert(path.isAbsolute(p) && path.normalize(p) === p, 'absolute canonical path required');
  let current = path.parse(p).root;
  for (const segment of p.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) {
      assert(!existing, 'missing path');
      continue;
    }
    const s = fs.lstatSync(current);
    assert(!s.isSymbolicLink(), 'symlink forbidden');
  }
  if (existing) {
    assert(fs.realpathSync(p) === p, 'path alias forbidden');
    const s = fs.statSync(p);
    assert(directory ? s.isDirectory() : s.isFile(), 'wrong path type');
  }
  return p;
}
export function readJSON(p) {
  safePath(path.resolve(p));
  return parse(fs.readFileSync(p, 'utf8'));
}
export function writePrivate(p, v, exclusive = true) {
  const fd = fs.openSync(p, exclusive ? 'wx' : 'w', 0o600);
  try {
    fs.writeFileSync(fd, typeof v === 'string' ? v : `${canonical(v)}\n`);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
export function append(p, v) {
  const fd = fs.openSync(
    p,
    fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NOFOLLOW,
  );
  try {
    fs.writeSync(fd, `${canonical(v)}\n`);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
export function syncDir(p) {
  const fd = fs.openSync(p, 'r');
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
export function jsonl(p) {
  const s = fs.readFileSync(p, 'utf8');
  assert(!s || s.endsWith('\n'), 'truncated journal');
  return s.split('\n').filter(Boolean).map(parse);
}
export function args(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      out._.push(a);
      continue;
    }
    assert(!Object.hasOwn(out, a.slice(2)), 'duplicate argument');
    out[a.slice(2)] = argv[i + 1]?.startsWith('--') || !argv[i + 1] ? true : argv[++i];
  }
  return out;
}
export const main = (fn) =>
  fn().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
export function direct(url) {
  return process.argv[1] && url === new URL(`file://${path.resolve(process.argv[1])}`).href;
}
export function rng(seed) {
  let x = integer(seed, 0, 0xffffffff) || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return (x >>> 0) / 4294967296;
  };
}
export function shuffled(items, random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

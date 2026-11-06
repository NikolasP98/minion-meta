import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.css', '.html', '.js', '.mjs', '.scss', '.svelte', '.ts']);
const DEFAULT_LIMITS = Object.freeze({
  maxDirectories: 5_000,
  maxDepth: 64,
  maxFiles: 10_000,
  maxFileBytes: 4 * 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024,
});

function commentRanges(source) {
  const ranges = [];
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' || character === "'" || character === '`') {
      const quote = character;
      index += 1;
      while (index < source.length) {
        if (source[index] === '\\') index += 2;
        else if (source[index] === quote) break;
        else index += 1;
      }
      continue;
    }
    if (source.startsWith('<!--', index)) {
      const close = source.indexOf('-->', index + 4);
      const end = close < 0 ? source.length : close + 3;
      ranges.push([index, end]);
      index = end - 1;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const close = source.indexOf('*/', index + 2);
      const end = close < 0 ? source.length : close + 2;
      ranges.push([index, end]);
      index = end - 1;
      continue;
    }
    if (source.startsWith('//', index) && source[index - 1] !== ':') {
      const close = source.indexOf('\n', index + 2);
      const end = close < 0 ? source.length : close;
      ranges.push([index, end]);
      index = end - 1;
    }
  }
  return ranges;
}

function isInComment(ranges, index) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function lineAndColumn(source, index) {
  const before = source.slice(0, index);
  const lines = before.split('\n');
  return { line: lines.length, column: lines.at(-1).length + 1 };
}

function hasFallback(source, openParenIndex) {
  let depth = 0;
  for (let index = openParenIndex; index < source.length; index += 1) {
    const character = source[index];
    if (character === '(') depth += 1;
    if (character === ')') {
      depth -= 1;
      if (depth === 0) return false;
    }
    if (character === ',' && depth === 1) return true;
  }
  return false;
}

export function extractVarConsumers(source, file = '<memory>') {
  const consumers = [];
  const comments = commentRanges(source);
  const pattern = /var\(\s*(--[A-Za-z0-9_-]+)/g;
  for (const match of source.matchAll(pattern)) {
    if (isInComment(comments, match.index)) continue;
    const token = match[1];
    const tokenEnd = match.index + match[0].length;
    consumers.push({
      file,
      token,
      ...lineAndColumn(source, match.index),
      hasFallback: hasFallback(source, source.indexOf('(', match.index)),
      dynamicTemplate: source.slice(tokenEnd, tokenEnd + 2) === '${',
    });
  }
  return consumers;
}

export function extractTokenDeclarations(source, file = '<memory>') {
  const declarations = [];
  const comments = commentRanges(source);
  const cssDeclaration = /(^|[;{\s"'`])(--[A-Za-z0-9_-]+)\s*:/gm;
  for (const match of source.matchAll(cssDeclaration)) {
    if (isInComment(comments, match.index)) continue;
    declarations.push({
      file,
      token: match[2],
      origin: 'css-definition',
      ...lineAndColumn(source, match.index + match[1].length),
    });
  }

  const styleDirective = /style:(--[A-Za-z0-9_-]+)/g;
  for (const match of source.matchAll(styleDirective)) {
    if (isInComment(comments, match.index)) continue;
    declarations.push({
      file,
      token: match[1],
      origin: 'runtime-authored',
      ...lineAndColumn(source, match.index),
    });
  }

  const setProperty = /setProperty\(\s*['"](--[A-Za-z0-9_-]+)['"]/g;
  for (const match of source.matchAll(setProperty)) {
    if (isInComment(comments, match.index)) continue;
    declarations.push({
      file,
      token: match[1],
      origin: 'runtime-authored',
      ...lineAndColumn(source, match.index),
    });
  }
  return declarations;
}

function collectContractKeys(value, tokens) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (key.startsWith('--')) tokens.add(key);
    collectContractKeys(child, tokens);
  }
}

function readBoundedRegular(file, maxBytes, label) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`${label} must be a regular file`);
  if (stat.size > maxBytes) throw new Error(`${label} exceeds ${maxBytes} bytes`);
  return readFileSync(file, 'utf8');
}

export function resolveInstalledTokenArtifacts(rootDir) {
  const root = resolve(rootDir);
  const manifest = join(root, 'package.json');
  if (!existsSync(manifest)) throw new Error(`Missing consumer package.json at ${manifest}`);
  const requireFromConsumer = createRequire(manifest);
  let contractPath;
  let generatedCssPath;
  try {
    contractPath = requireFromConsumer.resolve('@minion-stack/design-tokens/contract.json');
    generatedCssPath = requireFromConsumer.resolve('@minion-stack/design-tokens/tokens.css');
  } catch (error) {
    throw new Error(`Unable to resolve installed @minion-stack/design-tokens artifacts: ${error.message}`);
  }

  const contractRoot = dirname(realpathSync(contractPath));
  const cssRoot = dirname(realpathSync(generatedCssPath));
  if (contractRoot !== cssRoot) {
    throw new Error('Installed design-token contract and generated CSS resolve from different package roots');
  }
  const packagePath = join(contractRoot, 'package.json');
  const packageManifest = JSON.parse(readBoundedRegular(packagePath, 64 * 1024, 'design-token package.json'));
  if (packageManifest.name !== '@minion-stack/design-tokens') {
    throw new Error('Resolved design-token artifacts have the wrong package identity');
  }
  return {
    packageRoot: contractRoot,
    packagePath,
    packageVersion: packageManifest.version,
    contractPath: realpathSync(contractPath),
    generatedCssPath: realpathSync(generatedCssPath),
  };
}

export function loadInstalledTokenContract(rootDir) {
  const artifacts = resolveInstalledTokenArtifacts(rootDir);
  const contractSource = readBoundedRegular(artifacts.contractPath, 2 * 1024 * 1024, 'design-token contract');
  const generatedCss = readBoundedRegular(
    artifacts.generatedCssPath,
    4 * 1024 * 1024,
    'generated design-token CSS',
  );
  const contract = JSON.parse(contractSource);
  if (!contract || typeof contract !== 'object' || Array.isArray(contract)) {
    throw new Error('Installed design-token contract must be an object');
  }
  const tokens = new Set();
  collectContractKeys(contract, tokens);
  for (const declaration of extractTokenDeclarations(generatedCss, artifacts.generatedCssPath)) {
    tokens.add(declaration.token);
  }
  if (tokens.size === 0) throw new Error('Installed design-token artifacts declare no CSS custom properties');
  return { ...artifacts, contract, tokens };
}

export function auditTokenSources({
  sources,
  contractTokens = new Set(),
  forbiddenTokens = new Set(),
  exceptionFor = () => null,
}) {
  const forbidden = forbiddenTokens instanceof Set ? forbiddenTokens : new Set(forbiddenTokens);
  const declarationOrigins = new Map();
  const forbiddenDefinitions = [];
  for (const token of contractTokens) declarationOrigins.set(token, new Set(['shared-contract']));

  for (const source of sources) {
    for (const declaration of extractTokenDeclarations(source.text, source.file)) {
      if (!declarationOrigins.has(declaration.token)) declarationOrigins.set(declaration.token, new Set());
      declarationOrigins.get(declaration.token).add(declaration.origin);
      if (forbidden.has(declaration.token)) {
        forbiddenDefinitions.push({ ...declaration, kind: 'forbidden-definition' });
      }
    }
  }

  const consumers = sources.flatMap((source) => extractVarConsumers(source.text, source.file));
  const unresolved = [...forbiddenDefinitions];
  const reasonCoded = [];

  for (const consumer of consumers) {
    if (forbidden.has(consumer.token)) {
      unresolved.push({ ...consumer, kind: 'forbidden-consumer' });
      continue;
    }
    const origins = declarationOrigins.get(consumer.token);
    if (origins) {
      if (origins.has('runtime-authored') && !origins.has('shared-contract') && !origins.has('css-definition')) {
        reasonCoded.push({
          ...consumer,
          reason: 'runtime-authored',
          detail: 'set by style directive or setProperty',
        });
      }
      continue;
    }
    const exception = exceptionFor(consumer);
    if (exception) reasonCoded.push({ ...consumer, ...exception });
    else unresolved.push({ ...consumer, kind: 'undefined-consumer' });
  }

  return { consumers, declarationOrigins, reasonCoded, unresolved };
}

function walkSourceFiles(rootDir, sourceDirs, ignoredDirectoryNames, limits) {
  const files = [];
  let directories = 0;
  const visit = (absolutePath, depth) => {
    if (!existsSync(absolutePath)) return;
    if (depth > limits.maxDepth) throw new Error(`Token audit exceeded directory depth ${limits.maxDepth}`);
    const stat = lstatSync(absolutePath);
    if (!stat.isDirectory() || stat.isSymbolicLink()) {
      throw new Error(`Token audit source root must be a regular directory: ${absolutePath}`);
    }
    directories += 1;
    if (directories > limits.maxDirectories) {
      throw new Error(`Token audit exceeded ${limits.maxDirectories} directories`);
    }
    for (const entry of readdirSync(absolutePath, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || ignoredDirectoryNames.has(entry.name)) continue;
      const child = join(absolutePath, entry.name);
      if (entry.isDirectory()) visit(child, depth + 1);
      else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
        files.push(child);
        if (files.length > limits.maxFiles) throw new Error(`Token audit exceeded ${limits.maxFiles} files`);
      }
    }
  };
  for (const directory of sourceDirs) visit(join(rootDir, directory), 0);
  return files.sort();
}

export function scanTokenIntegrity({
  rootDir,
  sourceDirs = ['src', 'static'],
  ignoredDirectoryNames = ['node_modules'],
  forbiddenTokens = new Set(),
  exceptionFor = () => null,
  limits: limitOverrides = {},
} = {}) {
  if (!rootDir) throw new Error('Token audit requires an explicit consumer root');
  const root = resolve(rootDir);
  const limits = { ...DEFAULT_LIMITS, ...limitOverrides };
  const shared = loadInstalledTokenContract(root);
  const files = walkSourceFiles(root, sourceDirs, new Set(ignoredDirectoryNames), limits);
  let totalBytes = 0;
  const sources = files.map((absolutePath) => {
    const stat = lstatSync(absolutePath);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Token audit source is not regular: ${absolutePath}`);
    if (stat.size > limits.maxFileBytes) {
      throw new Error(`Token audit source exceeds ${limits.maxFileBytes} bytes: ${absolutePath}`);
    }
    totalBytes += stat.size;
    if (totalBytes > limits.maxTotalBytes) {
      throw new Error(`Token audit exceeded ${limits.maxTotalBytes} aggregate source bytes`);
    }
    return {
      file: relative(root, absolutePath).replaceAll('\\', '/'),
      text: readFileSync(absolutePath, 'utf8'),
    };
  });
  return {
    rootDir: root,
    files,
    sourceBytes: totalBytes,
    shared,
    ...auditTokenSources({ sources, contractTokens: shared.tokens, forbiddenTokens, exceptionFor }),
  };
}

export function formatTokenAuditReport(result) {
  const lines = [
    '',
    '  token-integrity — CSS custom-property contract',
    '',
    `  files       ${result.files.length}`,
    `  consumers   ${result.consumers.length}`,
    `  declared    ${result.declarationOrigins.size}`,
    `  contract    ${relative(result.rootDir, result.shared.contractPath)}`,
    `  package     ${result.shared.packageVersion}`,
    `  exceptions  ${result.reasonCoded.length} reason-coded`,
  ];
  const reasons = new Map();
  for (const item of result.reasonCoded) reasons.set(item.reason, (reasons.get(item.reason) ?? 0) + 1);
  for (const [reason, count] of [...reasons].sort()) {
    lines.push(`               ${String(count).padStart(4)}  ${reason}`);
  }
  if (result.unresolved.length > 0) {
    lines.push('', `  violations  ${result.unresolved.length}`, '');
    for (const item of result.unresolved) {
      lines.push(
        `  ✕ ${item.file}:${item.line}:${item.column ?? 1}  ${item.token}  ${item.kind}${item.hasFallback ? ' (has fallback)' : ''}`,
      );
    }
  } else lines.push('', '  violations     0', '');
  return `${lines.join('\n')}\n`;
}

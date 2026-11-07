import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const sourceFiles = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(fullPath);
    else if (entry.isFile() && entry.name.endsWith('.js')) sourceFiles.push(fullPath);
  }
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

await collect(root);
const failures = [];

for (const filePath of sourceFiles) {
  const source = await readFile(filePath, 'utf8');
  const specifiers = [...source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)];

  for (const [, specifier] of specifiers) {
    if (!specifier.startsWith('.')) continue;
    const target = path.resolve(path.dirname(filePath), specifier);
    const candidates = path.extname(target)
      ? [target]
      : [target, target + '.js', path.join(target, 'index.js')];
    if (!(await Promise.all(candidates.map(exists))).some(Boolean)) {
      failures.push({ file: path.relative(root, filePath), import: specifier });
    }
  }
}

if (failures.length) {
  console.error('Unresolved relative imports:');
  for (const failure of failures) console.error('- ' + failure.file + ': ' + failure.import);
  process.exitCode = 1;
} else {
  console.log('Import check passed: ' + sourceFiles.length + ' JavaScript files scanned.');
}

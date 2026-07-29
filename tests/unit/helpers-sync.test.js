import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The analytics helpers exist twice: the shipped copy in project/data.js and a
// test mirror in tests/unit/helpers.js (data.js is a browser global script, not
// an ES module, so it can't be imported directly). These functions are pure and
// were hand-copied — this guard fails CI if the two copies ever drift, so the
// code under test can never silently diverge from the code that ships.

const HERE = dirname(fileURLToPath(import.meta.url));
const dataJs = readFileSync(join(HERE, '../../project/data.js'), 'utf8');
const helpersJs = readFileSync(join(HERE, 'helpers.js'), 'utf8');

const FNS = ['isoWeek', 'weekRange', 'parseWeekInput', 'periodRange', 'bucketTests', 'summarize', 'repeatOffenders'];

// Pull a top-level `function NAME(...) { ... }` block, tolerating an `export`
// prefix, and normalise away comments / blank lines / indentation so only the
// executable logic is compared.
function extract(src, name) {
  const re = new RegExp(`^(?:export )?function ${name}\\b[\\s\\S]*?\\n}`, 'm');
  const m = re.exec(src);
  if (!m) return null;
  return m[0]
    .replace(/^export /, '')
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, '').trimEnd())   // strip line comments
    .map(line => line.trim())
    .filter(line => line.length)
    .join('\n');
}

describe('analytics helpers stay in sync (data.js ↔ tests/unit/helpers.js)', () => {
  for (const name of FNS) {
    it(`${name}() is identical in both copies`, () => {
      const inData = extract(dataJs, name);
      const inHelpers = extract(helpersJs, name);
      expect(inData, `${name} not found in project/data.js`).toBeTruthy();
      expect(inHelpers, `${name} not found in tests/unit/helpers.js`).toBeTruthy();
      expect(inHelpers).toBe(inData);
    });
  }
});

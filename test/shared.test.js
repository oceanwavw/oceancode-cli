'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const {
  SAFETY_NEGATIONS,
  normalizePath,
  parseProdinclude,
  isFileMatch,
  shouldSkipFile,
} = require('../lib/shared');

describe('normalizePath', () => {
  test('converts backslashes to forward slashes', () => {
    assert.strictEqual(normalizePath('src\\utils\\index.js'), 'src/utils/index.js');
  });

  test('strips leading ./', () => {
    assert.strictEqual(normalizePath('./src/index.js'), 'src/index.js');
  });

  test('leaves clean paths unchanged', () => {
    assert.strictEqual(normalizePath('src/index.js'), 'src/index.js');
  });
});

describe('parseProdinclude', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('parses include and negation patterns', async () => {
    await fs.writeFile(path.join(tmpDir, '.prodinclude'), [
      '# comment',
      'src/**',
      'lib/**',
      '',
      '!src/**/*.test.*',
      'README.md',
    ].join('\n'));
    const { includes, negations } = await parseProdinclude(tmpDir);
    assert.deepStrictEqual(includes, ['src/**', 'lib/**', 'README.md']);
    assert.ok(negations.includes('!src/**/*.test.*'));
    SAFETY_NEGATIONS.forEach(neg => {
      assert.ok(negations.includes(`!${neg}`), `missing safety negation: ${neg}`);
    });
  });

  test('throws if .prodinclude missing', async () => {
    await assert.rejects(() => parseProdinclude(tmpDir), /\.prodinclude not found/);
  });
});

describe('isFileMatch', () => {
  test('matches included file', () => {
    assert.strictEqual(isFileMatch('src/index.js', ['src/**'], []), true);
  });

  test('rejects non-included file', () => {
    assert.strictEqual(isFileMatch('dist/bundle.js', ['src/**'], []), false);
  });

  test('negation excludes matched file', () => {
    assert.strictEqual(
      isFileMatch('src/foo.test.js', ['src/**'], ['!src/**/*.test.*']),
      false
    );
  });

  test('safety negation blocks .git', () => {
    const safetyNegs = SAFETY_NEGATIONS.map(s => `!${s}`);
    assert.strictEqual(isFileMatch('.git/config', ['**'], safetyNegs), false);
  });

  test('safety negation blocks node_modules', () => {
    const safetyNegs = SAFETY_NEGATIONS.map(s => `!${s}`);
    assert.strictEqual(isFileMatch('node_modules/foo/index.js', ['**'], safetyNegs), false);
  });
});

describe('shouldSkipFile', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sync-skip-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('returns false when target does not exist', async () => {
    const src = path.join(tmpDir, 'a.txt');
    const dst = path.join(tmpDir, 'b.txt');
    await fs.writeFile(src, 'hello');
    assert.strictEqual(await shouldSkipFile(src, dst, false), false);
  });

  test('returns true when size and mtime match', async () => {
    const src = path.join(tmpDir, 'a.txt');
    const dst = path.join(tmpDir, 'b.txt');
    await fs.writeFile(src, 'hello');
    await fs.copy(src, dst, { preserveTimestamps: true });
    assert.strictEqual(await shouldSkipFile(src, dst, false), true);
  });

  test('returns false when force is true', async () => {
    const src = path.join(tmpDir, 'a.txt');
    const dst = path.join(tmpDir, 'b.txt');
    await fs.writeFile(src, 'hello');
    await fs.copy(src, dst, { preserveTimestamps: true });
    assert.strictEqual(await shouldSkipFile(src, dst, true), false);
  });
});

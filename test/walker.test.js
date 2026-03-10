'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { walkTree } = require('../lib/walker');

describe('walkTree', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walk-test-'));
    await fs.outputFile(path.join(tmpDir, 'src/index.js'), 'code');
    await fs.outputFile(path.join(tmpDir, 'src/utils/helper.js'), 'code');
    await fs.outputFile(path.join(tmpDir, 'node_modules/foo/index.js'), 'code');
    await fs.outputFile(path.join(tmpDir, '.git/config'), 'git');
    await fs.outputFile(path.join(tmpDir, 'README.md'), 'readme');
    await fs.outputFile(path.join(tmpDir, '.env'), 'secret');
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  test('returns normalized relative paths', async () => {
    const files = await walkTree(tmpDir);
    assert.ok(files.includes('src/index.js'));
    assert.ok(files.includes('src/utils/helper.js'));
    assert.ok(files.includes('README.md'));
  });

  test('includes all files when no safety filter', async () => {
    const files = await walkTree(tmpDir);
    assert.ok(files.length >= 5);
  });

  test('filters out safety-negated paths when filter provided', async () => {
    const { SAFETY_NEGATIONS } = require('../lib/shared');
    const files = await walkTree(tmpDir, SAFETY_NEGATIONS);
    assert.ok(!files.some(f => f.startsWith('.git/')));
    assert.ok(!files.some(f => f.startsWith('node_modules/')));
    assert.ok(!files.includes('.env'));
    assert.ok(files.includes('src/index.js'));
    assert.ok(files.includes('README.md'));
  });
});

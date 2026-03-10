'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { dev2prod } = require('../lib/dev2prod');

describe('dev2prod', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
    await fs.outputFile(path.join(devDir, 'src/index.js'), 'main code');
    await fs.outputFile(path.join(devDir, 'src/app.test.js'), 'test code');
    await fs.outputFile(path.join(devDir, 'lib/utils.js'), 'utils');
    await fs.outputFile(path.join(devDir, 'README.md'), 'readme');
    await fs.outputFile(path.join(devDir, 'node_modules/foo/index.js'), 'dep');
    await fs.outputFile(path.join(devDir, '.env'), 'SECRET=123');
    await fs.outputFile(path.join(devDir, '.git/config'), 'git config');
    await fs.writeFile(path.join(devDir, '.prodinclude'), [
      'src/**',
      'lib/**',
      'README.md',
      '!src/**/*.test.*',
    ].join('\n'));
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('copies only allowlisted files to prod', async () => {
    const code = await dev2prod({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.ok(await fs.pathExists(path.join(prodDir, 'src/index.js')));
    assert.ok(await fs.pathExists(path.join(prodDir, 'lib/utils.js')));
    assert.ok(await fs.pathExists(path.join(prodDir, 'README.md')));
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'src/app.test.js'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'node_modules'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, '.env'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, '.git'))));
  });

  test('creates .prodroot marker', async () => {
    await dev2prod({ dev: devDir, prod: prodDir });
    assert.ok(await fs.pathExists(path.join(prodDir, '.prodroot')));
  });

  test('mirror deletes stale files in prod', async () => {
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await fs.outputFile(path.join(prodDir, 'old_file.js'), 'stale');
    await dev2prod({ dev: devDir, prod: prodDir, mirror: true });
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'old_file.js'))));
  });

  test('dry-run does not write files', async () => {
    await dev2prod({ dev: devDir, prod: prodDir, dryRun: true });
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'src/index.js'))));
  });

  test('works with non-existent prod path and mirror', async () => {
    await fs.remove(prodDir);
    const newProdDir = prodDir + '-new';
    const code = await dev2prod({ dev: devDir, prod: newProdDir, mirror: true });
    assert.strictEqual(code, 0);
    assert.ok(await fs.pathExists(path.join(newProdDir, 'src/index.js')));
    assert.ok(await fs.pathExists(path.join(newProdDir, '.prodroot')));
    prodDir = newProdDir; // so afterEach cleans it up
  });

  test('skips unchanged files', async () => {
    await dev2prod({ dev: devDir, prod: prodDir });
    const stat1 = await fs.stat(path.join(prodDir, 'src/index.js'));
    await dev2prod({ dev: devDir, prod: prodDir });
    const stat2 = await fs.stat(path.join(prodDir, 'src/index.js'));
    assert.strictEqual(stat1.mtimeMs, stat2.mtimeMs);
  });
});

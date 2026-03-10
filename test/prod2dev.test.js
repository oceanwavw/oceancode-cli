'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { prod2dev } = require('../lib/prod2dev');

describe('prod2dev', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prod-'));
    await fs.writeFile(path.join(devDir, '.prodinclude'), [
      'src/**',
      'lib/**',
      'README.md',
    ].join('\n'));
    await fs.outputFile(path.join(devDir, 'src/index.js'), 'old dev code');
    await fs.outputFile(path.join(devDir, 'src/extra.js'), 'dev only but allowlisted');
    await fs.outputFile(path.join(devDir, 'lib/utils.js'), 'old utils');
    await fs.outputFile(path.join(devDir, 'README.md'), 'old readme');
    // WSL2: filesystem mtime resolution can be too coarse, so back-date dev files
    const past = new Date(Date.now() - 2000);
    for (const f of ['src/index.js', 'src/extra.js', 'lib/utils.js', 'README.md']) {
      await fs.utimes(path.join(devDir, f), past, past);
    }
    await fs.writeFile(path.join(prodDir, '.prodroot'), '');
    await fs.outputFile(path.join(prodDir, 'src/index.js'), 'new prod code');
    await fs.outputFile(path.join(prodDir, 'lib/utils.js'), 'new utils');
    await fs.outputFile(path.join(prodDir, 'README.md'), 'new readme');
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('copies prod files to dev', async () => {
    const code = await prod2dev({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/index.js'), 'utf8'), 'new prod code');
    assert.strictEqual(await fs.readFile(path.join(devDir, 'lib/utils.js'), 'utf8'), 'new utils');
  });

  test('does not copy .prodroot to dev', async () => {
    await prod2dev({ dev: devDir, prod: prodDir });
    assert.ok(!(await fs.pathExists(path.join(devDir, '.prodroot'))));
  });

  test('emits .prod_deletes for allowlisted files missing from prod', async () => {
    await prod2dev({ dev: devDir, prod: prodDir });
    const deleteFile = path.join(devDir, '.prod_deletes');
    assert.ok(await fs.pathExists(deleteFile));
    const content = await fs.readFile(deleteFile, 'utf8');
    assert.ok(content.includes('src/extra.js'));
  });

  test('dry-run does not write files', async () => {
    await prod2dev({ dev: devDir, prod: prodDir, dryRun: true });
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/index.js'), 'utf8'), 'old dev code');
  });
});

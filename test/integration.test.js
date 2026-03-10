'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { dev2prod } = require('../lib/dev2prod');
const { prod2dev } = require('../lib/prod2dev');
const { prune } = require('../lib/prune');

describe('integration: full round-trip', () => {
  let devDir, prodDir;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'int-dev-'));
    prodDir = await fs.mkdtemp(path.join(os.tmpdir(), 'int-prod-'));

    await fs.writeFile(path.join(devDir, '.prodinclude'), [
      'src/**',
      'README.md',
      '!src/**/*.test.*',
    ].join('\n'));
    await fs.outputFile(path.join(devDir, 'src/index.js'), 'v1');
    await fs.outputFile(path.join(devDir, 'src/app.test.js'), 'test');
    await fs.outputFile(path.join(devDir, 'README.md'), 'readme v1');
    await fs.outputFile(path.join(devDir, '.env'), 'SECRET');
    await fs.outputFile(path.join(devDir, 'node_modules/x/i.js'), 'dep');
  });

  afterEach(async () => {
    await fs.remove(devDir);
    await fs.remove(prodDir);
  });

  test('dev2prod → modify in prod → prod2dev → prune', async () => {
    // Step 1: dev2prod
    let code = await dev2prod({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.ok(await fs.pathExists(path.join(prodDir, 'src/index.js')));
    assert.ok(await fs.pathExists(path.join(prodDir, '.prodroot')));
    assert.ok(!(await fs.pathExists(path.join(prodDir, 'src/app.test.js'))));
    assert.ok(!(await fs.pathExists(path.join(prodDir, '.env'))));

    // Step 2: Simulate changes in prod (as if pulled from remote)
    await fs.writeFile(path.join(prodDir, 'src/index.js'), 'v2 from remote');
    await fs.outputFile(path.join(prodDir, 'src/new_file.js'), 'new from remote');
    // Remove README from prod (simulating upstream deletion)
    await fs.remove(path.join(prodDir, 'README.md'));

    // Step 3: prod2dev
    code = await prod2dev({ dev: devDir, prod: prodDir });
    assert.strictEqual(code, 0);
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/index.js'), 'utf8'), 'v2 from remote');
    assert.strictEqual(await fs.readFile(path.join(devDir, 'src/new_file.js'), 'utf8'), 'new from remote');

    // .prod_deletes should list README.md
    const deleteList = path.join(devDir, '.prod_deletes');
    assert.ok(await fs.pathExists(deleteList));
    const deleteContent = await fs.readFile(deleteList, 'utf8');
    assert.ok(deleteContent.includes('README.md'));

    // Step 4: prune
    code = await prune({ dev: devDir, deletelist: deleteList });
    assert.strictEqual(code, 0);
    assert.ok(!(await fs.pathExists(path.join(devDir, 'README.md'))));

    // Dev-only files should still exist
    assert.ok(await fs.pathExists(path.join(devDir, 'src/app.test.js')));
    assert.ok(await fs.pathExists(path.join(devDir, '.env')));
  });
});

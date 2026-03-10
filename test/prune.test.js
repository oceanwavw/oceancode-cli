'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const { test, describe, beforeEach, afterEach } = require('node:test');

const { prune } = require('../lib/prune');

describe('prune', () => {
  let devDir, deleteListPath;

  beforeEach(async () => {
    devDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prune-'));
    deleteListPath = path.join(devDir, '.prod_deletes');
    await fs.outputFile(path.join(devDir, 'src/old.js'), 'old code');
    await fs.outputFile(path.join(devDir, 'src/keep.js'), 'keep this');
    await fs.outputFile(path.join(devDir, 'lib/deprecated.js'), 'deprecated');
  });

  afterEach(async () => {
    await fs.remove(devDir);
  });

  test('deletes listed files', async () => {
    await fs.writeFile(deleteListPath, 'src/old.js\nlib/deprecated.js\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
    assert.ok(!(await fs.pathExists(path.join(devDir, 'src/old.js'))));
    assert.ok(!(await fs.pathExists(path.join(devDir, 'lib/deprecated.js'))));
    assert.ok(await fs.pathExists(path.join(devDir, 'src/keep.js')));
  });

  test('skips comments and blank lines', async () => {
    await fs.writeFile(deleteListPath, '# comment\n\nsrc/old.js\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
    assert.ok(!(await fs.pathExists(path.join(devDir, 'src/old.js'))));
  });

  test('removes empty parent dirs', async () => {
    await fs.writeFile(deleteListPath, 'lib/deprecated.js\n');
    await prune({ dev: devDir, deletelist: deleteListPath });
    assert.ok(!(await fs.pathExists(path.join(devDir, 'lib'))));
  });

  test('rejects path traversal', async () => {
    await fs.writeFile(deleteListPath, '../etc/passwd\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
    assert.ok(await fs.pathExists(path.join(devDir, 'src/old.js')));
  });

  test('rejects absolute paths', async () => {
    await fs.writeFile(deleteListPath, '/etc/passwd\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
  });

  test('warns on missing files', async () => {
    await fs.writeFile(deleteListPath, 'nonexistent.js\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
  });

  test('rejects symlink escaping dev root', async () => {
    const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'outside-'));
    await fs.outputFile(path.join(outsideDir, 'secret.txt'), 'do not delete');
    await fs.ensureSymlink(outsideDir, path.join(devDir, 'escape_link'));
    await fs.writeFile(deleteListPath, 'escape_link/secret.txt\n');
    const code = await prune({ dev: devDir, deletelist: deleteListPath });
    assert.strictEqual(code, 0);
    assert.ok(await fs.pathExists(path.join(outsideDir, 'secret.txt')));
    await fs.remove(outsideDir);
  });

  test('dry-run does not delete', async () => {
    await fs.writeFile(deleteListPath, 'src/old.js\n');
    await prune({ dev: devDir, deletelist: deleteListPath, dryRun: true });
    assert.ok(await fs.pathExists(path.join(devDir, 'src/old.js')));
  });
});

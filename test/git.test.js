const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-git-'));
}

describe('git command .prodroot guard', () => {
  it('requireProdroot throws without .prodroot', async () => {
    const tmp = await makeTempDir();
    const repoDir = path.join(tmp, 'myrepo');
    await fs.mkdirp(repoDir);

    const { requireProdroot } = require('../src/commands/git');
    assert.throws(() => requireProdroot(repoDir), /\.prodroot/);
    await fs.remove(tmp);
  });

  it('requireProdroot passes with .prodroot', async () => {
    const tmp = await makeTempDir();
    const repoDir = path.join(tmp, 'myrepo');
    await fs.mkdirp(repoDir);
    await fs.writeFile(path.join(repoDir, '.prodroot'), '');

    const { requireProdroot } = require('../src/commands/git');
    assert.doesNotThrow(() => requireProdroot(repoDir));
    await fs.remove(tmp);
  });

  it('isReadOnly correctly classifies actions', () => {
    const { isReadOnly } = require('../src/commands/git');
    assert.ok(isReadOnly('status'));
    assert.ok(isReadOnly('fetch'));
    assert.ok(!isReadOnly('commit'));
    assert.ok(!isReadOnly('push'));
    assert.ok(!isReadOnly('pull'));
    assert.ok(!isReadOnly('init'));
    assert.ok(!isReadOnly('remote-add'));
  });
});

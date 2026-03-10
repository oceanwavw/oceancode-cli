const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-cfg-'));
}

describe('config loader', () => {
  it('loads valid yaml and returns repos', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'sync_repos.yaml');
    fs.writeFileSync(cfgPath, 'repos:\n  myrepo: lib/myrepo\n  other: lib/other\n');

    const { loadConfig, resolveRepos } = require('../src/lib/config');
    const config = loadConfig(cfgPath);
    assert.ok(config.repos);
    assert.equal(config.repos.myrepo, 'lib/myrepo');

    const all = resolveRepos(config, null);
    assert.equal(all.length, 2);
    assert.equal(all[0].name, 'myrepo');
    assert.equal(all[0].path, 'lib/myrepo');

    const filtered = resolveRepos(config, 'myrepo');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'myrepo');

    await fs.remove(tmp);
  });

  it('throws on unknown repo name', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'sync_repos.yaml');
    fs.writeFileSync(cfgPath, 'repos:\n  myrepo: lib/myrepo\n');

    const { loadConfig, resolveRepos } = require('../src/lib/config');
    const config = loadConfig(cfgPath);
    assert.throws(() => resolveRepos(config, 'nonexistent'), /Unknown repos/);

    await fs.remove(tmp);
  });
});

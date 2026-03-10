const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-sync-'));
}

describe('sync command', () => {
  it('dev2prod syncs matched files via lib', async () => {
    const tmp = await makeTempDir();
    const dev = path.join(tmp, 'dev');
    const prod = path.join(tmp, 'prod');
    await fs.mkdirp(dev);
    await fs.mkdirp(prod);
    await fs.writeFile(path.join(prod, '.prodroot'), '');
    await fs.writeFile(path.join(dev, '.prodinclude'), '**\n');
    await fs.writeFile(path.join(dev, 'hello.txt'), 'hello');

    const { dev2prod } = require('../src/lib/dev2prod');
    const exitCode = await dev2prod({ dev, prod, force: true });
    assert.equal(exitCode, 0);
    assert.ok(await fs.pathExists(path.join(prod, 'hello.txt')));
    await fs.remove(tmp);
  });

  it('resolveRepos filters by comma-delimited names', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'sync_repos.yaml');
    const yaml = require('js-yaml');
    fs.writeFileSync(cfgPath, yaml.dump({ repos: { repoA: 'lib/repoA', repoB: 'lib/repoB' } }));

    const { loadConfig, resolveRepos } = require('../src/lib/config');
    const config = loadConfig(cfgPath);
    const repos = resolveRepos(config, 'repoA');
    assert.equal(repos.length, 1);
    assert.equal(repos[0].name, 'repoA');
    await fs.remove(tmp);
  });
});

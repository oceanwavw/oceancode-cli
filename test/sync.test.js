const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');
const yaml = require('js-yaml');

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

  it('resolveRepos filters by comma-delimited names (unified loader)', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump({
      workspace: { prod_root: '/some/prod' },
      repos: { repoA: 'lib/repoA', repoB: 'lib/repoB' },
    }));

    const { loadConfig, resolveRepos } = require('../src/lib/configLoader');
    const config = loadConfig(cfgPath);
    const repos = resolveRepos(config, 'repoA');
    assert.equal(repos.length, 1);
    assert.equal(repos[0].name, 'repoA');
    await fs.remove(tmp);
  });

  it('sync run uses oceancode.yaml with workspace.prod_root', async () => {
    const tmp = await makeTempDir();
    const devRoot = path.join(tmp, 'dev');
    const prodRoot = path.join(tmp, 'prod');
    const repoRel = 'myrepo';
    const devRepo = path.join(devRoot, repoRel);
    const prodRepo = path.join(prodRoot, repoRel);

    await fs.mkdirp(devRepo);
    await fs.mkdirp(prodRepo);
    await fs.writeFile(path.join(prodRepo, '.prodroot'), '');
    await fs.writeFile(path.join(devRepo, '.prodinclude'), '**\n');
    await fs.writeFile(path.join(devRepo, 'data.txt'), 'content');

    const cfgPath = path.join(devRoot, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump({
      workspace: { prod_root: prodRoot },
      repos: { myrepo: repoRel },
    }));

    // Simulate running from devRoot with --config
    const origCwd = process.cwd();
    const origExit = process.exit;
    let exitCode;
    process.exit = (code) => { exitCode = code; };
    process.chdir(devRoot);
    try {
      // Clear require cache so sync.js picks up configLoader
      delete require.cache[require.resolve('../src/commands/sync')];
      const { run } = require('../src/commands/sync');
      await run(['dev2prod', '--config', cfgPath, '--force']);
    } finally {
      process.chdir(origCwd);
      process.exit = origExit;
    }
    assert.equal(exitCode, 0);

    assert.ok(await fs.pathExists(path.join(prodRepo, 'data.txt')));
    const content = await fs.readFile(path.join(prodRepo, 'data.txt'), 'utf8');
    assert.equal(content, 'content');
    await fs.remove(tmp);
  });
});

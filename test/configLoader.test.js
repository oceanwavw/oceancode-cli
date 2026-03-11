'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

describe('configLoader', () => {
  let tmpDir;

  it('loads full oceancode.yaml and returns config object', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = {
      workspace: { prod_root: '/tmp/prod' },
      repos: { oceanfarm: 'lib/oceanfarm', oceanquant: 'lib/oceanquant' },
      build: { python_version: '3.12' },
      launchers: { dash: { dev: { cwd: 'lib/dash', cmd: 'npm run dev' } } },
    };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.equal(result.workspace.prod_root, '/tmp/prod');
    assert.equal(result.repos.oceanfarm, 'lib/oceanfarm');
    assert.equal(result.build.python_version, '3.12');
    assert.ok(result.launchers.dash);
  });

  it('loads partial config with only repos section', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = { repos: { oceanfarm: 'lib/oceanfarm' } };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.equal(result.repos.oceanfarm, 'lib/oceanfarm');
    assert.equal(result.workspace, undefined);
    assert.equal(result.build, undefined);
  });

  it('throws on missing file', () => {
    const { loadConfig } = require('../src/lib/configLoader');
    assert.throws(() => loadConfig('/nonexistent/oceancode.yaml'), /not found/);
  });

  it('requireSection throws with clear message when section missing', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = { repos: { oceanfarm: 'lib/oceanfarm' } };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig, requireSection } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.throws(
      () => requireSection(result, 'workspace.prod_root'),
      /Missing config section 'workspace\.prod_root'/
    );
  });

  it('requireSection passes when section exists', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cfg-'));
    const config = { workspace: { prod_root: '/tmp/prod' }, repos: { a: 'lib/a' } };
    const cfgPath = path.join(tmpDir, 'oceancode.yaml');
    fs.writeFileSync(cfgPath, yaml.dump(config));

    const { loadConfig, requireSection } = require('../src/lib/configLoader');
    const result = loadConfig(cfgPath);
    assert.doesNotThrow(() => requireSection(result, 'workspace.prod_root'));
    assert.doesNotThrow(() => requireSection(result, 'repos'));
  });

  it('resolveRepos returns array from repos object map', () => {
    const { resolveRepos } = require('../src/lib/configLoader');
    const config = { repos: { oceanfarm: 'lib/oceanfarm', oceanquant: 'lib/oceanquant' } };
    const repos = resolveRepos(config, null);
    assert.equal(repos.length, 2);
    assert.equal(repos[0].name, 'oceanfarm');
    assert.equal(repos[0].path, 'lib/oceanfarm');
  });

  it('resolveRepos filters by comma-delimited names', () => {
    const { resolveRepos } = require('../src/lib/configLoader');
    const config = { repos: { oceanfarm: 'lib/oceanfarm', oceanquant: 'lib/oceanquant' } };
    const repos = resolveRepos(config, 'oceanfarm');
    assert.equal(repos.length, 1);
    assert.equal(repos[0].name, 'oceanfarm');
  });

  it('resolveRepos throws on unknown repo', () => {
    const { resolveRepos } = require('../src/lib/configLoader');
    const config = { repos: { oceanfarm: 'lib/oceanfarm' } };
    assert.throws(() => resolveRepos(config, 'nonexistent'), /Unknown repos/);
  });

  it('resolveRepos rejects absolute repo paths', () => {
    const { resolveRepos } = require('../src/lib/configLoader');
    const config = { repos: { bad: '/absolute/path' } };
    assert.throws(() => resolveRepos(config, null), /absolute path/);
  });
});

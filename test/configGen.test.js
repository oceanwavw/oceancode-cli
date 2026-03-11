'use strict';
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');
const { generateConfig, writeConfigAtomic } = require('../src/lib/configGen');
const defaults = require('../src/lib/defaults');

describe('config generation', () => {
  it('writeConfigAtomic writes file atomically', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cg-'));
    const filePath = path.join(tmpDir, 'test.yaml');
    writeConfigAtomic(filePath, { repos: { foo: 'bar' } });
    const content = yaml.load(fs.readFileSync(filePath, 'utf8'));
    assert.deepEqual(content, { repos: { foo: 'bar' } });
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('writeConfigAtomic does not leave temp file on error', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-cg-'));
    const badPath = path.join(tmpDir, 'nonexistent', 'test.yaml');
    assert.throws(() => writeConfigAtomic(badPath, {}));
    // No .tmp file should exist
    const files = fs.readdirSync(tmpDir);
    assert.equal(files.length, 0);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('generateConfig produces unified oceancode.yaml structure', () => {
    const config = generateConfig({
      prodRoot: '/tmp/prod',
      repos: [{ name: 'oceanfarm', path: 'lib/oceanfarm' }],
      pythonVersion: '3.12',
      venvTargets: [{ name: 'oceanwave_dash', path: 'lib/front_ends/oceanwave_dash' }],
      frontendTargets: [{ name: 'oceanreact', path: 'lib/front_ends/oceanreact' }],
      goTargets: [{ name: 'oceandata-cli', path: 'lib/cli/oceandata-cli' }],
      launchers: [{ name: 'oceanwave_dash', label: 'OceanWave Dashboard' }],
    });
    assert.equal(config.workspace.prod_root, '/tmp/prod');
    assert.equal(config.repos.oceanfarm, 'lib/oceanfarm');
    assert.equal(config.build.python_version, '3.12');
    assert.ok(config.build.venv.oceanwave_dash);
    assert.equal(config.build.frontends.length, 1);
    assert.equal(config.build.cli_tools.length, 1);
    assert.ok(config.launchers.oceanwave_dash);
  });

  it('generated config is loadable by configLoader', () => {
    const { loadConfig, requireSection } = require('../src/lib/configLoader');
    const config = generateConfig({
      prodRoot: '/tmp/prod',
      repos: [{ name: 'a', path: 'lib/a' }],
      venvTargets: [],
      frontendTargets: [],
      goTargets: [],
      launchers: [],
    });
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oc-gen-'));
    const filePath = path.join(tmpDir, 'oceancode.yaml');
    writeConfigAtomic(filePath, config);
    const loaded = loadConfig(filePath);
    assert.doesNotThrow(() => requireSection(loaded, 'workspace.prod_root'));
    assert.doesNotThrow(() => requireSection(loaded, 'repos'));
    assert.doesNotThrow(() => requireSection(loaded, 'build'));
    assert.doesNotThrow(() => requireSection(loaded, 'launchers'));
    fs.rmSync(tmpDir, { recursive: true });
  });
});

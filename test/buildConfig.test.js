'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-bcfg-'));
}

describe('build config loader', () => {
  it('loads valid build.yaml and returns config', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'build.yaml');
    fs.writeFileSync(cfgPath, [
      'python_version: "3.12"',
      'pypi_deps:',
      '  - numpy',
      'local_packages:',
      '  - name: mypkg',
      '    path: lib/mypkg',
      'frontends:',
      '  - name: myfe',
      '    path: lib/myfe',
      '    verify: dist',
      'cli_tools:',
      '  - name: mycli',
      '    path: lib/mycli',
      '    type: go',
      'preflight_tools:',
      '  backends: [uv]',
      '  frontends: [node]',
      '  cli: [go]',
    ].join('\n'));

    const { loadBuildConfig } = require('../src/lib/build/buildConfig');
    const config = loadBuildConfig(cfgPath);
    assert.equal(config.python_version, '3.12');
    assert.ok(Array.isArray(config.pypi_deps));
    assert.equal(config.pypi_deps[0], 'numpy');
    assert.equal(config.local_packages[0].name, 'mypkg');
    assert.equal(config.frontends[0].name, 'myfe');
    assert.equal(config.cli_tools[0].name, 'mycli');
    await fs.remove(tmp);
  });

  it('throws on missing file', () => {
    const { loadBuildConfig } = require('../src/lib/build/buildConfig');
    assert.throws(() => loadBuildConfig('/nonexistent/build.yaml'), /not found/);
  });

  it('resolveTarget returns matching items from config array', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'build.yaml');
    fs.writeFileSync(cfgPath, [
      'python_version: "3.12"',
      'local_packages:',
      '  - name: pkgA',
      '    path: lib/pkgA',
      '  - name: pkgB',
      '    path: lib/pkgB',
      'frontends: []',
      'cli_tools: []',
      'preflight_tools:',
      '  backends: [uv]',
    ].join('\n'));

    const { loadBuildConfig, resolveTarget } = require('../src/lib/build/buildConfig');
    const config = loadBuildConfig(cfgPath);
    const all = resolveTarget(config.local_packages, null);
    assert.equal(all.length, 2);
    const filtered = resolveTarget(config.local_packages, 'pkgA');
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, 'pkgA');
    assert.throws(() => resolveTarget(config.local_packages, 'nonexistent'), /Unknown target/);
    await fs.remove(tmp);
  });

  it('validates paths and warns on missing directories', async () => {
    const tmp = await makeTempDir();
    const cfgPath = path.join(tmp, 'build.yaml');
    fs.writeFileSync(cfgPath, [
      'python_version: "3.12"',
      'local_packages:',
      '  - name: missing_pkg',
      '    path: lib/does_not_exist',
      'frontends: []',
      'cli_tools: []',
    ].join('\n'));

    const { loadBuildConfig } = require('../src/lib/build/buildConfig');
    // Should not throw, just warn
    const config = loadBuildConfig(cfgPath, tmp);
    assert.ok(config);
    assert.equal(config.local_packages[0].name, 'missing_pkg');
    await fs.remove(tmp);
  });
});

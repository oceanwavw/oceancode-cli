'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

describe('cli builder', () => {
  it('buildGoCmd returns go build with correct output path', () => {
    const { buildGoCmd } = require('../src/lib/build/cli');
    const cmd = buildGoCmd('/workspace/lib/cli/mycli', '/workspace/bin/linux', 'mycli', '');
    assert.equal(cmd, 'go build -o "/workspace/bin/linux/mycli" .');
  });

  it('buildGoCmd appends .exe on windows', () => {
    const { buildGoCmd } = require('../src/lib/build/cli');
    const cmd = buildGoCmd('/workspace/lib/cli/mycli', '/workspace/bin/win', 'mycli', '.exe');
    assert.equal(cmd, 'go build -o "/workspace/bin/win/mycli.exe" .');
  });

  it('buildBunCmd returns bun build with correct args', () => {
    const { buildBunCmd } = require('../src/lib/build/cli');
    const cmd = buildBunCmd('/workspace/bin/linux', 'mycli', 'src/cli.ts', '');
    assert.equal(cmd, 'bun build src/cli.ts --compile --outfile "/workspace/bin/linux/mycli"');
  });

  it('buildBunCmd appends .exe on windows', () => {
    const { buildBunCmd } = require('../src/lib/build/cli');
    const cmd = buildBunCmd('/workspace/bin/win', 'mycli', 'src/cli.ts', '.exe');
    assert.equal(cmd, 'bun build src/cli.ts --compile --outfile "/workspace/bin/win/mycli.exe"');
  });
});

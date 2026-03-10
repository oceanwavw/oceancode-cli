'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'oc-fe-'));
}

describe('frontends builder', () => {
  it('getDefaultSteps returns npm install + npm run build', () => {
    const { getDefaultSteps } = require('../src/lib/build/frontends');
    const steps = getDefaultSteps();
    assert.deepEqual(steps, ['npm install', 'npm run build']);
  });

  it('verifyFrontend passes when verify dir exists with files', async () => {
    const tmp = await makeTempDir();
    const feDir = path.join(tmp, 'myfe');
    const distDir = path.join(feDir, 'dist');
    await fs.mkdirp(distDir);
    await fs.writeFile(path.join(distDir, 'index.js'), '// built');

    const { verifyFrontend } = require('../src/lib/build/frontends');
    assert.equal(verifyFrontend(feDir, 'dist'), true);
    await fs.remove(tmp);
  });

  it('verifyFrontend fails when verify dir missing', async () => {
    const tmp = await makeTempDir();
    const feDir = path.join(tmp, 'myfe');
    await fs.mkdirp(feDir);

    const { verifyFrontend } = require('../src/lib/build/frontends');
    assert.equal(verifyFrontend(feDir, 'dist'), false);
    await fs.remove(tmp);
  });

  it('verifyFrontend fails when verify dir empty', async () => {
    const tmp = await makeTempDir();
    const feDir = path.join(tmp, 'myfe');
    const distDir = path.join(feDir, 'dist');
    await fs.mkdirp(distDir);

    const { verifyFrontend } = require('../src/lib/build/frontends');
    assert.equal(verifyFrontend(feDir, 'dist'), false);
    await fs.remove(tmp);
  });
});

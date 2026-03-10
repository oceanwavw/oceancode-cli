'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getPlatform } = require('./platform');

function getDefaultSteps() {
  return ['npm install', 'npm run build'];
}

function verifyFrontend(feDir, verifyPath) {
  const fullPath = path.join(feDir, verifyPath);
  if (!fs.existsSync(fullPath)) return false;
  try {
    const entries = fs.readdirSync(fullPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

function runCmd(cmd, cwd) {
  console.log(`  $ ${cmd}`);
  const shell = getPlatform() === 'windows' ? 'cmd.exe' : '/bin/sh';
  const shellFlag = getPlatform() === 'windows' ? '/c' : '-c';
  execSync(cmd, { stdio: 'inherit', cwd, shell: true });
}

async function buildFrontends(config, workspaceRoot, targetPkg) {
  const frontends = config.frontends || [];

  const targets = targetPkg
    ? frontends.filter(f => f.name === targetPkg)
    : frontends;

  if (targetPkg && targets.length === 0) {
    throw new Error(`Unknown frontend: ${targetPkg}`);
  }

  let pass = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const fe = targets[i];
    const feDir = path.join(workspaceRoot, fe.path);
    console.log(`\n[${i + 1}/${targets.length}] Building ${fe.name}...`);

    if (!fs.existsSync(feDir)) {
      console.error(`  ERROR: directory not found: ${feDir}`);
      fail++;
      continue;
    }

    const steps = fe.steps || getDefaultSteps();
    try {
      for (const step of steps) {
        runCmd(step, feDir);
      }

      if (fe.verify) {
        if (verifyFrontend(feDir, fe.verify)) {
          console.log(`  [PASS] ${fe.name} verified`);
          pass++;
        } else {
          console.log(`  [FAIL] ${fe.name} verify dir missing or empty: ${fe.verify}`);
          fail++;
        }
      } else {
        pass++;
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nFrontend build: ${pass} passed, ${fail} failed`);
  if (fail > 0) throw new Error('Frontend build failed');
}

module.exports = { getDefaultSteps, verifyFrontend, buildFrontends };

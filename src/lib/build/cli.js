'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getBinDir, getBinExt } = require('./platform');

function buildGoCmd(toolDir, binDir, name, ext) {
  const outPath = path.join(binDir, name + ext);
  return `go build -o "${outPath}" .`;
}

function buildBunCmd(binDir, name, entry, ext) {
  const outPath = path.join(binDir, name + ext);
  return `bun build ${entry} --compile --outfile "${outPath}"`;
}

function runCmd(cmd, cwd) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

async function buildCli(config, workspaceRoot, targetPkg) {
  const tools = config.cli_tools || [];
  const binDir = path.join(workspaceRoot, getBinDir());
  const ext = getBinExt();

  const targets = targetPkg
    ? tools.filter(t => t.name === targetPkg)
    : tools;

  if (targetPkg && targets.length === 0) {
    throw new Error(`Unknown CLI tool: ${targetPkg}`);
  }

  // Ensure bin dir exists
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  let pass = 0, fail = 0;

  for (let i = 0; i < targets.length; i++) {
    const tool = targets[i];
    const toolDir = path.join(workspaceRoot, tool.path);
    console.log(`\n[${i + 1}/${targets.length}] Building ${tool.name} (${tool.type})...`);

    if (!fs.existsSync(toolDir)) {
      console.error(`  ERROR: directory not found: ${toolDir}`);
      fail++;
      continue;
    }

    try {
      switch (tool.type) {
        case 'go':
          runCmd('go mod download', toolDir);
          runCmd(buildGoCmd(toolDir, binDir, tool.name, ext), toolDir);
          break;
        case 'bun':
          runCmd('bun install', toolDir);
          runCmd(buildBunCmd(binDir, tool.name, tool.entry, ext), toolDir);
          break;
        default:
          throw new Error(`Unknown CLI tool type: ${tool.type}`);
      }

      // Verify
      const binPath = path.join(binDir, tool.name + ext);
      if (fs.existsSync(binPath)) {
        console.log(`  [PASS] ${tool.name}`);
        pass++;
      } else {
        console.log(`  [FAIL] ${tool.name} binary not found at ${binPath}`);
        fail++;
      }
    } catch (e) {
      console.error(`  ERROR: ${e.message}`);
      fail++;
    }
  }

  console.log(`\nCLI build: ${pass} passed, ${fail} failed`);
  if (fail > 0) throw new Error('CLI build failed');
}

module.exports = { buildGoCmd, buildBunCmd, buildCli };

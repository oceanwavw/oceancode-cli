'use strict';

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { getPlatform, getPlatformKey, getVenvBin, getScriptExt } = require('./platform');

function buildVenvCmd(venvPath, pythonVersion) {
  return `uv venv "${venvPath}" --python "${pythonVersion}"`;
}

function buildPipInstallCmd(pythonBin, deps) {
  return `uv pip install --python "${pythonBin}" ${deps.join(' ')}`;
}

function buildLocalInstallCmd(pythonBin, pkgPath, extras) {
  const target = extras ? `${pkgPath}${extras}` : pkgPath;
  return `uv pip install --python "${pythonBin}" -e "${target}"`;
}

function buildVerifyCmd(pythonBin, pkgName) {
  return `"${pythonBin}" -c "import ${pkgName}"`;
}

function runCmd(cmd, opts) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

async function buildBackends(config, workspaceRoot, targetPkg) {
  const platform = getPlatformKey();

  // Resolve primary venv
  const venvConfig = config.venv && config.venv.oceanwave_dash;
  if (!venvConfig) throw new Error('No venv.oceanwave_dash in build.yaml');

  const venvDir = venvConfig.dir[platform];
  if (!venvDir) throw new Error(`No venv dir for platform: ${platform}`);

  const venvPath = path.join(workspaceRoot, venvConfig.path, venvDir);
  const pythonBin = getVenvBin(venvPath);

  const packages = config.local_packages || [];

  // Granular mode: just reinstall the target package
  if (targetPkg) {
    if (!fs.existsSync(venvPath)) {
      throw new Error(`Venv not found at ${venvPath} — run "oceancode build backends" first to create the full environment.`);
    }
    const pkg = packages.find(p => p.name === targetPkg);
    if (!pkg) throw new Error(`Unknown backend package: ${targetPkg}`);

    console.log(`\nRebuilding ${pkg.name}...`);
    const pkgPath = path.join(workspaceRoot, pkg.path);
    runCmd(buildLocalInstallCmd(pythonBin, pkgPath, pkg.extras || null));

    if (pkg.rust_extension) {
      const rustPath = path.join(workspaceRoot, pkg.rust_extension.path);
      runCmd(buildPipInstallCmd(pythonBin, ['maturin']));
      const maturinBin = getPlatform() === 'windows'
        ? path.join(venvPath, 'Scripts', 'maturin.exe')
        : path.join(venvPath, 'bin', 'maturin');
      runCmd(`"${maturinBin}" develop --release`, { cwd: rustPath, env: { ...process.env, VIRTUAL_ENV: venvPath } });
    }

    if (pkg.build_script) {
      const scriptBase = pkg.build_script.replace('{platform}', platform === 'macos' ? 'macos' : (platform === 'windows' ? 'win' : 'linux'));
      const scriptPath = path.join(workspaceRoot, pkg.path, scriptBase + getScriptExt());
      runCmd(getPlatform() === 'windows' ? `call "${scriptPath}"` : `bash "${scriptPath}"`);
    }

    return;
  }

  // Full build
  console.log('\n[1] Creating virtual environment...');
  if (fs.existsSync(venvPath)) {
    console.log('  Removing existing venv...');
    fs.rmSync(venvPath, { recursive: true, force: true });
  }
  runCmd(buildVenvCmd(venvPath, config.python_version || '3.12'));

  console.log('\n[2] Installing PyPI dependencies...');
  const pypiDeps = config.pypi_deps || [];
  if (pypiDeps.length > 0) {
    runCmd(buildPipInstallCmd(pythonBin, pypiDeps));
  }

  console.log('\n[3] Installing local packages...');
  for (const pkg of packages) {
    console.log(`  Installing ${pkg.name}...`);
    const pkgPath = path.join(workspaceRoot, pkg.path);
    runCmd(buildLocalInstallCmd(pythonBin, pkgPath, pkg.extras || null));

    if (pkg.rust_extension) {
      console.log(`  Building ${pkg.name} Rust extension...`);
      const rustPath = path.join(workspaceRoot, pkg.rust_extension.path);
      runCmd(buildPipInstallCmd(pythonBin, ['maturin']));
      const maturinBin = getPlatform() === 'windows'
        ? path.join(venvPath, 'Scripts', 'maturin.exe')
        : path.join(venvPath, 'bin', 'maturin');
      runCmd(`"${maturinBin}" develop --release`, { cwd: rustPath, env: { ...process.env, VIRTUAL_ENV: venvPath } });
    }

    if (pkg.build_script) {
      console.log(`  Running build script for ${pkg.name}...`);
      const scriptBase = pkg.build_script.replace('{platform}', platform === 'macos' ? 'macos' : (platform === 'windows' ? 'win' : 'linux'));
      const scriptPath = path.join(workspaceRoot, pkg.path, scriptBase + getScriptExt());
      runCmd(getPlatform() === 'windows' ? `call "${scriptPath}"` : `bash "${scriptPath}"`);
    }
  }

  // Build additional venvs (oceandata_gui, etc.)
  const venvEntries = Object.entries(config.venv || {}).filter(([k]) => k !== 'oceanwave_dash');
  for (const [name, vCfg] of venvEntries) {
    console.log(`\nBuilding ${name} venv...`);
    const pkg = packages.find(p => p.name === name);
    if (pkg && pkg.build_script) {
      const scriptBase = pkg.build_script.replace('{platform}', platform === 'macos' ? 'macos' : (platform === 'windows' ? 'win' : 'linux'));
      const scriptPath = path.join(workspaceRoot, pkg.path, scriptBase + getScriptExt());
      runCmd(getPlatform() === 'windows' ? `call "${scriptPath}"` : `bash "${scriptPath}"`);
    }
  }

  console.log('\n[4] Verifying installation...');
  let pass = 0, fail = 0;
  for (const pkg of packages) {
    try {
      execSync(buildVerifyCmd(pythonBin, pkg.name), { stdio: ['pipe', 'pipe', 'pipe'] });
      console.log(`  [PASS] ${pkg.name}`);
      pass++;
    } catch {
      console.log(`  [FAIL] ${pkg.name}`);
      fail++;
    }
    // Also verify Rust extension module if present
    if (pkg.rust_extension) {
      const extModule = pkg.name + '_rust';
      try {
        execSync(buildVerifyCmd(pythonBin, extModule), { stdio: ['pipe', 'pipe', 'pipe'] });
        console.log(`  [PASS] ${extModule}`);
        pass++;
      } catch {
        console.log(`  [FAIL] ${extModule}`);
        fail++;
      }
    }
  }
  console.log(`\nBackend verification: ${pass} passed, ${fail} failed`);
  if (fail > 0) throw new Error('Backend verification failed');
}

module.exports = { buildVenvCmd, buildPipInstallCmd, buildLocalInstallCmd, buildVerifyCmd, buildBackends };

'use strict';

module.exports = {
  repos: [
    { name: 'oceanfarm', path: 'lib/oceanfarm' },
    { name: 'oceanquant', path: 'lib/oceanquant' },
    { name: 'oceandata', path: 'lib/oceandata' },
    { name: 'oceanseed', path: 'lib/oceanseed' },
    { name: 'oceanlive', path: 'lib/oceanlive' },
    { name: 'oceanutil', path: 'lib/oceanutil' },
    { name: 'oceancap', path: 'lib/oceancap' },
    { name: 'oceandoc', path: 'lib/oceandoc' },
    { name: 'oceanreef', path: 'lib/oceanreef' },
    { name: 'oceanshed', path: 'lib/oceanshed' },
    { name: 'jsonldb', path: 'lib/jsonldb' },
    { name: 'dataportal', path: 'lib/dataportal' },
    { name: 'oceandata_app', path: 'lib/back_ends/oceandata_app' },
    { name: 'oceanfarm_app', path: 'lib/back_ends/oceanfarm_app' },
    { name: 'oceanlive_app', path: 'lib/back_ends/oceanlive_app' },
    { name: 'oceanseed_app', path: 'lib/back_ends/oceanseed_app' },
    { name: 'oceanhub_app', path: 'lib/back_ends/oceanhub_app' },
    { name: 'oceanapp', path: 'lib/front_ends/oceanapp' },
    { name: 'oceandata_gui', path: 'lib/front_ends/oceandata_gui' },
    { name: 'oceandata_tau', path: 'lib/front_ends/oceandata_tau' },
    { name: 'oceannode', path: 'lib/front_ends/oceannode' },
    { name: 'oceanpyqt', path: 'lib/front_ends/oceanpyqt' },
    { name: 'oceanreact', path: 'lib/front_ends/oceanreact' },
    { name: 'oceanwave_dash', path: 'lib/front_ends/oceanwave_dash' },
    { name: 'oceandata-cli', path: 'lib/cli/oceandata-cli' },
  ],

  pythonVenvTargets: [
    { name: 'oceanwave_dash', path: 'lib/front_ends/oceanwave_dash' },
    { name: 'oceandata_gui', path: 'lib/front_ends/oceandata_gui' },
    { name: 'oceandata_tau', path: 'lib/front_ends/oceandata_tau' },
    { name: 'dataportal', path: 'lib/dataportal' },
    { name: 'oceanshed', path: 'lib/oceanshed' },
    { name: 'oceanquant', path: 'lib/oceanquant' },
  ],

  frontendTargets: [
    { name: 'oceanwave_dash', path: 'lib/front_ends/oceanwave_dash' },
    { name: 'oceandata_tau', path: 'lib/front_ends/oceandata_tau' },
    { name: 'dataportal', path: 'lib/dataportal' },
    { name: 'oceanreact', path: 'lib/front_ends/oceanreact' },
    { name: 'oceannode', path: 'lib/front_ends/oceannode' },
  ],

  goTargets: [
    { name: 'oceandata-cli', path: 'lib/cli/oceandata-cli' },
    { name: 'dataportal-go', path: 'lib/dataportal/go_backend' },
  ],

  launchers: [
    { name: 'oceanwave_dash', label: 'OceanWave Dashboard' },
    { name: 'oceandata_gui', label: 'OceanData GUI' },
    { name: 'oceandata_tau', label: 'OceanData Tau' },
    { name: 'dataportal', label: 'Data Portal' },
    { name: 'oceanhub_app', label: 'OceanHub Server' },
  ],

  launcherConfigs: {
    oceanwave_dash: {
      dev: { cwd: 'lib/front_ends/oceanwave_dash', cmd: 'npm run dev' },
      prod: {
        binary: { linux: 'bin/linux/oceanwave', macos: 'bin/macos/oceanwave', windows: 'bin/win/oceanwave.exe' },
      },
    },
    oceandata_gui: {
      dev: { venv_path: 'lib/front_ends/oceandata_gui', entry: 'oceandata_gui/main.py' },
      prod: {
        binary: { linux: 'bin/linux/oceandata', macos: 'bin/macos/oceandata', windows: 'bin/win/oceandata.exe' },
      },
    },
    oceandata_tau: {
      dev: { cwd: 'lib/front_ends/oceandata_tau', cmd: 'npm run dev' },
      prod: {
        binary: { linux: 'bin/linux/oceandata_tau', macos: 'bin/macos/oceandata_tau', windows: 'bin/win/oceandata_tau.exe' },
      },
    },
    dataportal: {
      dev: { cwd: 'lib/dataportal', cmd: 'npm run dev' },
      prod: {
        binary: { linux: 'bin/linux/dataportal', macos: 'bin/macos/dataportal', windows: 'bin/win/dataportal.exe' },
      },
    },
    oceanhub_app: {
      dev: { venv_path: 'lib/back_ends/oceanhub_app', entry: 'oceanhub_app/main.py' },
      prod: {
        binary: { linux: 'bin/linux/oceanhub', macos: 'bin/macos/oceanhub', windows: 'bin/win/oceanhub.exe' },
      },
    },
  },

  pypiDeps: [
    'loguru', 'base36', 'scipy', 'matplotlib', 'plotly', 'bokeh', 'numba',
    'pandas', 'numpy', 'toml', 'fastapi', 'uvicorn', 'pydantic', 'httpx',
    'pytest', 'pytest-asyncio', 'requests', 'pyyaml', 'python-dateutil',
    'gitpython', 'gita', 'pandas-ta==0.4.71b0',
  ],

  preflightTools: {
    backends: ['uv'],
    frontends: ['node', 'npm'],
    cli: ['go'],
  },

  toolInstall: {
    uv: {
      url: 'https://docs.astral.sh/uv/',
      auto: {
        linux: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
        macos: 'curl -LsSf https://astral.sh/uv/install.sh | sh',
        windows: 'winget install --id astral-sh.uv -e --accept-source-agreements --accept-package-agreements',
      },
    },
    node: {
      url: 'https://nodejs.org/',
      auto: {
        macos: 'brew install node',
        windows: 'winget install --id OpenJS.NodeJS.LTS -e --accept-source-agreements --accept-package-agreements',
      },
    },
    go: {
      url: 'https://go.dev/',
      auto: {
        macos: 'brew install go',
        windows: 'winget install --id GoLang.Go -e --accept-source-agreements --accept-package-agreements',
      },
    },
    bun: {
      url: 'https://bun.sh/',
      auto: {
        linux: 'curl -fsSL https://bun.sh/install | bash',
        macos: 'curl -fsSL https://bun.sh/install | bash',
        windows: 'winget install --id Oven-sh.Bun -e --accept-source-agreements --accept-package-agreements',
      },
    },
    cargo: {
      url: 'https://rustup.rs/',
      auto: {
        linux: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
        macos: "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y",
        windows: 'winget install --id Rustlang.Rustup -e --accept-source-agreements --accept-package-agreements',
      },
    },
  },
};

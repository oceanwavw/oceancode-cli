# Cloning Oceanwave Codebase on macOS

## Prerequisites

- Git installed (`xcode-select --install` or `brew install git`)
- Network access to the NAS at `nas.network.local:3000` (Gitea)
- Gitea credentials (username: `pachao`)

## 1. Create the directory structure

```bash
mkdir -p ~/oceanwave/lib/{back_ends,front_ends,playground}
cd ~/oceanwave/lib
```

## 2. Clone repos from Gitea

Replace `<TOKEN>` with your Gitea personal access token.

```bash
GITEA="http://pachao:<TOKEN>@nas.network.local:3000"
```

### Top-level lib/ repos (oceanwave org)

```bash
cd ~/oceanwave/lib

git clone $GITEA/oceanwave/oceancap.git
git clone $GITEA/oceanwave/oceandata.git
git clone $GITEA/oceanwave/oceandoc.git
git clone $GITEA/oceanwave/oceanfarm.git
git clone $GITEA/oceanwave/oceanlive.git
git clone $GITEA/oceanwave/oceanquant.git
git clone $GITEA/oceanwave/oceanreef.git
git clone $GITEA/oceanwave/oceanseed.git
git clone $GITEA/oceanwave/oceanshed.git
git clone $GITEA/oceanwave/oceanutil.git
```

### Top-level lib/ repos (pachao user)

```bash
git clone $GITEA/pachao/bbgserver.git
git clone $GITEA/pachao/datagate.git
git clone $GITEA/pachao/jsonldb.git
```

### Nested repos

```bash
cd ~/oceanwave/lib/front_ends
git clone $GITEA/oceanwave/oceandata_tau.git

cd ~/oceanwave/lib/back_ends
git clone $GITEA/oceanwave/oceandata_app.git

cd ~/oceanwave/lib/playground
git clone $GITEA/oceanwave/oceanchat.git
```

### From GitHub

```bash
cd ~/oceanwave/lib
git clone https://github.com/leiwu0227/specdev-cli.git
```

## 3. Set git remote name to `nas`

By default `git clone` names the remote `origin`. To match the Windows setup, rename them:

```bash
cd ~/oceanwave/lib
for dir in oceancap oceandata oceandoc oceanfarm oceanlive oceanquant \
           oceanreef oceanseed oceanshed oceanutil bbgserver datagate jsonldb; do
  (cd "$dir" && git remote rename origin nas 2>/dev/null)
done

(cd front_ends/oceandata_tau && git remote rename origin nas 2>/dev/null)
(cd back_ends/oceandata_app && git remote rename origin nas 2>/dev/null)
(cd playground/oceanchat && git remote rename origin nas 2>/dev/null)
```

## 4. Repos NOT on Gitea

These exist on the Windows machine but have no remote. Copy them manually or initialize later:

| Directory | Notes |
|-----------|-------|
| `jsonlfile` | Git repo, no remote |
| `oceanskills` | Git repo, no remote |
| `back_ends/` | Not a git repo (container dir) |
| `cli/` | Not a git repo |
| `front_ends/` | Not a git repo (container dir) |
| `legacy/` | Not a git repo |
| `nul/` | Not a git repo |
| `playground/` | Not a git repo (container dir) |

## 5. Proxy note

If you use a proxy on macOS, make sure local NAS traffic bypasses it:

```bash
export no_proxy="nas.network.local"
```

Or configure git specifically:

```bash
git config --global http.proxy ""
git config --global --unset http.proxy
# Then set proxy only for external hosts if needed:
# git config --global http.https://github.com.proxy http://127.0.0.1:10809
```

## Quick one-liner clone all

```bash
TOKEN="<your-gitea-token>"
GITEA="http://pachao:${TOKEN}@nas.network.local:3000"

mkdir -p ~/oceanwave/lib/{back_ends,front_ends,playground} && cd ~/oceanwave/lib && \
for repo in oceanwave/oceancap oceanwave/oceandata oceanwave/oceandoc \
  oceanwave/oceanfarm oceanwave/oceanlive oceanwave/oceanquant \
  oceanwave/oceanreef oceanwave/oceanseed oceanwave/oceanshed \
  oceanwave/oceanutil pachao/bbgserver pachao/datagate pachao/jsonldb; do
  name=$(basename "$repo")
  git clone "$GITEA/$repo.git" "$name" && (cd "$name" && git remote rename origin nas)
done && \
(cd front_ends && git clone "$GITEA/oceanwave/oceandata_tau.git" && cd oceandata_tau && git remote rename origin nas) && \
(cd back_ends && git clone "$GITEA/oceanwave/oceandata_app.git" && cd oceandata_app && git remote rename origin nas) && \
(cd playground && git clone "$GITEA/oceanwave/oceanchat.git" && cd oceanchat && git remote rename origin nas) && \
git clone https://github.com/leiwu0227/specdev-cli.git
```

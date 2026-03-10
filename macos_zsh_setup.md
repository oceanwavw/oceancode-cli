# macOS Zsh Prompt & Color Setup

Replicates the Windows/WSL2 zsh setup: Powerlevel10k with orange directory prefix, syntax highlighting, autosuggestions, and vivid LS_COLORS.

## 1. Install Oh My Zsh

```bash
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"
```

## 2. Install Powerlevel10k

```bash
git clone --depth=1 https://github.com/romkatv/powerlevel10k.git \
  ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/themes/powerlevel10k
```

## 3. Install plugins

```bash
# zsh-autosuggestions
git clone https://github.com/zsh-users/zsh-autosuggestions \
  ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-autosuggestions

# zsh-syntax-highlighting
git clone https://github.com/zsh-users/zsh-syntax-highlighting \
  ${ZSH_CUSTOM:-$HOME/.oh-my-zsh/custom}/plugins/zsh-syntax-highlighting
```

## 4. Install a Nerd Font

Powerlevel10k uses Nerd Font icons. Install one (e.g. MesloLGS NF):

```bash
brew install --cask font-meslo-lg-nerd-font
```

Then set your terminal (iTerm2 / Terminal.app / Warp) to use **MesloLGS Nerd Font** or **MesloLGS NF**.

## 5. Set up `~/.zshrc`

Replace (or merge into) your `~/.zshrc`:

```bash
# Powerlevel10k instant prompt (keep at top)
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

export ZSH="$HOME/.oh-my-zsh"

ZSH_THEME="powerlevel10k/powerlevel10k"

plugins=(
  git
  zsh-autosuggestions
  zsh-syntax-highlighting
)

source $ZSH/oh-my-zsh.sh

# LS_COLORS (see step 6)
if [ -f "$HOME/.local/share/lscolors.sh" ]; then
  source "$HOME/.local/share/lscolors.sh"
fi

# Powerlevel10k config (see step 7)
[[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh

# Show dot files in glob
setopt GLOB_DOTS
```

## 6. Set up LS_COLORS

Install `vivid` (generates rich LS_COLORS):

```bash
brew install vivid
```

Then generate the colors file:

```bash
mkdir -p ~/.local/share
vivid generate molokai > ~/.local/share/lscolors.sh
```

Edit `~/.local/share/lscolors.sh` so it looks like:

```bash
LS_COLORS='<output from vivid>'
export LS_COLORS
```

Alternatively, copy the `lscolors.sh` file from the Windows machine directly:

```bash
# From the Windows machine (via NAS or USB)
cp /path/to/lscolors.sh ~/.local/share/lscolors.sh
```

## 7. Configure Powerlevel10k (the orange directory)

You have two options:

### Option A: Run the wizard

```bash
p10k configure
```

Choose: **Nerd Font** > **Classic** > **Unicode** > **Darkest** > **Angled** > **Flat** > **Flat** > **1 line** > **Compact** > **Many icons** > **Concise** > **Verbose**

Then edit `~/.p10k.zsh` to set the orange directory color (see below).

### Option B: Copy the config from Windows

Copy `~/.p10k.zsh` from the Windows/WSL machine directly. It's fully portable.

### Key color settings in `~/.p10k.zsh`

These are the lines that produce the orange directory prefix. Find and set them in your `~/.p10k.zsh`:

```bash
# Orange directory foreground (215 = sandy orange in 256-color palette)
typeset -g POWERLEVEL9K_DIR_FOREGROUND=215
typeset -g POWERLEVEL9K_DIR_SHORTENED_FOREGROUND=103
typeset -g POWERLEVEL9K_DIR_ANCHOR_FOREGROUND=215
typeset -g POWERLEVEL9K_DIR_ANCHOR_BOLD=true

# Git status colors
typeset -g POWERLEVEL9K_VCS_CLEAN_FOREGROUND=76
typeset -g POWERLEVEL9K_VCS_UNTRACKED_FOREGROUND=76
typeset -g POWERLEVEL9K_VCS_MODIFIED_FOREGROUND=178

# Left prompt segments
typeset -g POWERLEVEL9K_LEFT_PROMPT_ELEMENTS=(
  os_icon
  dir
  vcs
)
```

## 8. Verify

Restart your terminal (or `exec zsh`). You should see:

- Orange-colored directory path in the prompt
- Git branch/status info next to the directory
- Colorful `ls` output
- Gray autosuggestions as you type
- Syntax highlighting (green = valid command, red = invalid)

## Color reference

| Element | Color code | Looks like |
|---------|-----------|------------|
| Directory path | 215 | Sandy orange |
| Shortened dirs | 103 | Muted blue-gray |
| Git clean | 76 | Green |
| Git modified | 178 | Yellow |
| Git untracked | 39 | Blue |
| Git conflicted | 196 | Red |
| Prompt OK | 76 | Green |
| Prompt error | 196 | Red |

To preview all 256 colors in your terminal:

```bash
for i in {0..255}; do print -Pn "%K{$i}  %k%F{$i}${(l:3::0:)i}%f " ${${(M)$((i%6)):#3}:+$'\n'}; done
```

# tmuxinator-save

A CLI tool to save existingtmux sessions as tmuxinator configuration files.

## Installation

You can install this package globally using npm:

```bash
npm install -g tmuxinator-save
```

### Running locally

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm link` to make the command available globally

## Usage

```bash
tmuxinator-save <session-name> <config-name>
```

### Arguments:

-   `session-name`: The name of the tmux session you want to save
-   `config-name`: The name for the tmuxinator config file (without .yml extension)

The tool will create a tmuxinator configuration file at `~/.config/tmuxinator/<config-name>.yml`

### Example:

```bash
tmuxinator-save mysession myproject
```

This will create a tmuxinator config file at `~/.config/tmuxinator/myproject.yml` based on the current state of the tmux session named "mysession".

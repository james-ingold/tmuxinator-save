#!/usr/bin/env node

import { program } from "commander";
import { exec } from "child_process";
import { promisify } from "util";
import { stringify } from "yaml";
import { writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const execAsync = promisify(exec);

// Function to map tmux layout to tmuxinator layout
function mapLayout(tmuxLayout) {
  // Even horizontal layout (contains square brackets without curly braces)
  if (tmuxLayout.includes("[") && !tmuxLayout.includes("{")) {
    return "even-horizontal";
  }

  // Even vertical layout (contains curly braces without square brackets)
  if (tmuxLayout.includes("{") && !tmuxLayout.includes("[")) {
    return "even-vertical";
  }

  // Tiled layout (contains both square brackets and curly braces)
  if (tmuxLayout.includes("[") && tmuxLayout.includes("{")) {
    return "tiled";
  }

  // Default to main-vertical if no specific pattern is matched
  return "main-vertical";
}

program
  .name("tmuxinator-save")
  .description("Save tmux session to tmuxinator config")
  .argument("<session>", "tmux session name to save")
  .argument(
    "<filename>",
    "name for the tmuxinator config file (without .yml extension)",
  )
  .action(async (session, filename) => {
    try {
      // Get windows and panes information
      const { stdout: windowsOutput } = await execAsync(
        `tmux list-windows -t ${session} -F "#{window_index}:#{window_name}:#{window_layout}"`,
      );

      const windows = await Promise.all(
        windowsOutput
          .trim()
          .split("\n")
          .map(async (line) => {
            const [index, name, layout] = line.split(":");

            // Get panes for this window
            const { stdout: panesOutput } = await execAsync(
              `tmux list-panes -t ${session}:${index} -F "#{pane_current_path}:#{pane_current_command}"`,
            );

            const panes = panesOutput
              .trim()
              .split("\n")
              .map((pane) => {
                const [path, command] = pane.split(":");
                return { path, command };
              });

            return {
              index: parseInt(index),
              name,
              layout,
              panes,
            };
          }),
      );

      // Create tmuxinator config
      const config = {
        name: filename,
        root: windows[0].panes[0].path, // Use first pane's path as project root
        windows: [],
      };

      // Keep track of window name counts
      const windowNameCounts = {};

      // Process each window
      for (const window of windows) {
        // Handle duplicate window names
        let windowName = window.name;
        if (windowName in windowNameCounts) {
          windowNameCounts[windowName]++;
          windowName = `${window.name}_${windowNameCounts[windowName]}`;
        } else {
          windowNameCounts[windowName] = 0;
        }

        const windowConfig = {
          [windowName]: {
            layout: mapLayout(window.layout),
          },
        };

        if (window.panes.length === 1) {
          windowConfig[windowName].root = window.panes[0].path;
        } else {
          // For multiple panes, create panes array with their paths and commands
          windowConfig[windowName].panes = window.panes.map((pane) => {
            if (pane.command === "bash" || pane.command === "zsh") {
              return `cd ${pane.path}`;
            }
            return [`cd ${pane.path}`, pane.command];
          });
        }

        config.windows.push(windowConfig);
      }

      // Convert to YAML
      const yamlContent = stringify(config);

      // Save to ~/.config/tmuxinator/
      const configPath = join(
        homedir(),
        ".config",
        "tmuxinator",
        `${filename}.yml`,
      );
      await writeFile(configPath, yamlContent);

      console.log(
        `Successfully saved tmux session '${session}' to tmuxinator config: ${configPath}`,
      );
    } catch (error) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

program.parse();

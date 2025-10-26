#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir, platform } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the actual package directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = __dirname;

console.log('🚀 Configuring Snapshot MCP Server...\n');

// Detect Claude Desktop config location
const getClaudeConfigPath = () => {
  const os = platform();

  if (os === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (os === 'win32') {
    return join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  } else {
    // Linux
    const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
    return join(xdgConfig, 'Claude', 'claude_desktop_config.json');
  }
};

// Get database path
const getDbPath = () => {
  const os = platform();

  if (os === 'darwin') {
    return join(homedir(), '.claude-snapshots', 'snapshots.db');
  } else if (os === 'win32') {
    return join(process.env.APPDATA || '', 'claude-snapshots', 'snapshots.db');
  } else {
    const xdgData = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');
    return join(xdgData, 'claude-snapshots', 'snapshots.db');
  }
};

try {
  const indexPath = join(packageDir, 'dist', 'index.js');
  const configPath = getClaudeConfigPath();
  const dbPath = getDbPath();

  console.log('📍 Paths:');
  console.log(`   Server: ${indexPath}`);
  console.log(`   Config: ${configPath}`);
  console.log(`   Database: ${dbPath}\n`);

  // Create database directory
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log('✅ Created database directory\n');
  }

  // Update Claude config
  console.log('⚙️  Updating Claude Desktop config...\n');

  let config = {};
  let configExists = existsSync(configPath);

  if (configExists) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
      console.log('   ✓ Found existing config file');

      if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
        console.log('   ✓ Existing MCP servers:', Object.keys(config.mcpServers).join(', '));
      }
    } catch (e) {
      console.log('   ⚠️  Could not parse existing config, creating new one');
      config = {};
    }
  } else {
    console.log('   ℹ  No existing config found, creating new one');
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  const snapshotConfig = {
    command: 'node',
    args: [indexPath],
    env: {
      SNAPSHOT_DB_PATH: dbPath
    }
  };

  const alreadyExists = config.mcpServers.snapshot !== undefined;

  if (alreadyExists) {
    console.log('   ℹ  Snapshot server already configured - updating...\n');
  } else {
    console.log('   ➕ Adding snapshot server to config\n');
  }

  // Create backup if config exists
  if (configExists) {
    const backupPath = configPath + '.backup';
    writeFileSync(backupPath, JSON.stringify(config, null, 2));
    console.log(`   💾 Backup created: ${backupPath}`);
  }

  // Update config
  config.mcpServers.snapshot = snapshotConfig;
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`   ✅ Config updated: ${configPath}\n`);

  console.log('✅ Setup complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Restart Claude Desktop completely (quit and reopen)');
  console.log('   2. Try: "Save a snapshot with summary: test, context: testing"');
  console.log('   3. Try: "List all snapshots"\n');

} catch (error) {
  console.error('\n❌ Setup failed:', error.message);
  process.exit(1);
}

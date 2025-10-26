#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { homedir, platform } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Get the actual package directory (not user's cwd)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageDir = __dirname;

console.log('🚀 Installing Snapshot MCP Server...\n');

// Detect Claude Desktop config location
const getClaudeConfigPath = () => {
  const os = platform();

  if (os === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
  } else if (os === 'win32') {
    return join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json');
  } else {
    // Linux - try common locations
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
  // Step 1: Install dependencies
  console.log('📦 Installing dependencies...');
  execSync('npm install', { stdio: 'inherit', cwd: packageDir });

  // Step 2: Build
  console.log('\n🔨 Building project...');
  execSync('npm run build', { stdio: 'inherit', cwd: packageDir });

  // Step 3: Get paths
  const projectDir = resolve(packageDir);
  const indexPath = join(projectDir, 'dist', 'index.js');
  const configPath = getClaudeConfigPath();
  const dbPath = getDbPath();

  console.log('\n📍 Paths:');
  console.log(`   Server: ${indexPath}`);
  console.log(`   Config: ${configPath}`);
  console.log(`   Database: ${dbPath}`);

  // Step 4: Create database directory
  const dbDir = join(dbPath, '..');
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log('\n✅ Created database directory');
  }

  // Step 5: Update Claude config
  console.log('\n⚙️  Updating Claude Desktop config...');

  let config = {};
  let configExists = existsSync(configPath);

  if (configExists) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf8'));
      console.log('   ✓ Found existing config file');

      // Show existing MCP servers
      if (config.mcpServers && Object.keys(config.mcpServers).length > 0) {
        console.log('   ✓ Existing MCP servers:', Object.keys(config.mcpServers).join(', '));
      }
    } catch (e) {
      console.log('   ⚠️  Warning: Could not parse existing config, creating new one');
      config = {};
    }
  } else {
    console.log('   ℹ  No existing config found, creating new one');
    // Create config directory
    const configDir = join(configPath, '..');
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
  }

  // Check if snapshot server already exists
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
    console.log('\n   ℹ  Snapshot server already configured');
    console.log('   Updating with new configuration...');
  } else {
    console.log('\n   ➕ Adding snapshot server to config');
  }

  // Show what will be added/updated
  console.log('\n   Configuration to be added:');
  console.log('   {');
  console.log('     "mcpServers": {');
  console.log('       "snapshot": {');
  console.log(`         "command": "node",`);
  console.log(`         "args": ["${indexPath}"],`);
  console.log(`         "env": {`);
  console.log(`           "SNAPSHOT_DB_PATH": "${dbPath}"`);
  console.log('         }');
  console.log('       }');
  console.log('     }');
  console.log('   }');

  // Create backup if config exists
  if (configExists) {
    const backupPath = configPath + '.backup';
    writeFileSync(backupPath, JSON.stringify(config, null, 2));
    console.log(`\n   💾 Backup created: ${backupPath}`);
  }

  // Update config
  config.mcpServers.snapshot = snapshotConfig;

  // Write config
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`   ✅ Config updated: ${configPath}`);

  // Show final status
  console.log('\n   Final MCP servers in config:', Object.keys(config.mcpServers).join(', '));

  console.log('\n✅ Installation complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Restart Claude Desktop completely (quit and reopen)');
  console.log('   2. Try: "Save a snapshot with summary: test, context: testing"');
  console.log('   3. Try: "List all snapshots"\n');
  console.log('🎉 Happy snapshotting!');

} catch (error) {
  console.error('\n❌ Installation failed:', error.message);
  console.error('\nPlease check the error above and try again.');
  process.exit(1);
}

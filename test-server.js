#!/usr/bin/env node
const { spawn } = require('child_process');

console.log('Testing Research Task MCP Server...\n');

// Set environment variable
process.env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || 'test-key';

// Spawn the server
const server = spawn('node', ['dist/index.js'], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

// Send list tools request
const listToolsRequest = JSON.stringify({
  jsonrpc: '2.0',
  method: 'tools/list',
  params: {},
  id: 1
}) + '\n';

server.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    if (response.result && response.result.tools) {
      console.log(`✓ Server responded with ${response.result.tools.length} tools\n`);
      console.log('New flexible research tools:');
      response.result.tools
        .filter(tool => !tool.description.includes('[Legacy]'))
        .forEach(tool => console.log(`  - ${tool.name}: ${tool.description}`));
      
      console.log('\nLegacy tools (backward compatibility):');
      response.result.tools
        .filter(tool => tool.description.includes('[Legacy]'))
        .forEach(tool => console.log(`  - ${tool.name}`));
      
      process.exit(0);
    }
  } catch (e) {
    // Ignore non-JSON output
  }
});

server.stderr.on('data', (data) => {
  const message = data.toString();
  if (message.includes('started successfully')) {
    console.log('✓ Server started successfully');
    server.stdin.write(listToolsRequest);
  } else if (message.includes('Error')) {
    console.error('✗ Server error:', message);
    process.exit(1);
  }
});

server.on('error', (err) => {
  console.error('✗ Failed to start server:', err.message);
  process.exit(1);
});

// Timeout after 5 seconds
setTimeout(() => {
  console.error('✗ Server did not respond within 5 seconds');
  server.kill();
  process.exit(1);
}, 5000);
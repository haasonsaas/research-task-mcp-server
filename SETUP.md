# Setup Guide for Claude Desktop

## Quick Start

1. **Build the project**:
   ```bash
   cd /Users/jonathanhaas/research-task-mcp-server
   npm install
   npm run build
   ```

2. **Get your Anthropic API key**:
   - Go to https://console.anthropic.com/
   - Create or copy your API key

3. **Configure Claude Desktop**:
   
   Open your Claude Desktop config file:
   ```bash
   open ~/Library/Application\ Support/Claude/claude_desktop_config.json
   ```

   Add this configuration (merge with existing content):
   ```json
   {
     "mcpServers": {
       "research-task": {
         "command": "node",
         "args": ["/Users/jonathanhaas/research-task-mcp-server/dist/index.js"],
         "env": {
           "ANTHROPIC_API_KEY": "YOUR_API_KEY_HERE"
         }
       }
     }
   }
   ```

4. **Restart Claude Desktop**:
   - Quit Claude Desktop completely (Cmd+Q)
   - Start Claude Desktop again

## Testing the Connection

In Claude Desktop, try:
```
Can you use the createResearchTask tool to create a new research task about "LLM evaluation tools"?
```

## Troubleshooting

### Server doesn't appear in Claude
1. Check the logs in Claude Desktop (Developer menu > Show Logs)
2. Verify the path to index.js is correct
3. Make sure you built the project (`npm run build`)

### API Key errors
1. Verify your API key is valid at https://console.anthropic.com/
2. Check that the key is correctly set in the config file
3. Ensure there are no extra spaces or quotes around the key

### Rate limit errors
- The server handles rate limiting automatically
- If you see rate limit errors, the server will retry automatically

## Example Usage Flow

1. Create a research task:
   ```
   Use createResearchTask with title "LLM Evaluation Market Analysis"
   ```

2. Define areas to research:
   ```
   Use defineEvaluationAreas to add areas like "path complexity metrics" and "XML parsing evaluation"
   ```

3. Initialize subagents with objectives

4. Run the research (this will use Claude API)

5. Synthesize findings 

6. Get recommendations
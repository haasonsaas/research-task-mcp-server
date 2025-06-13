# Research Task MCP Server v2

A powerful MCP (Model Context Protocol) server that enables AI-powered research on **ANY topic** through an interactive configuration wizard. Originally designed for LLM evaluation tools, now completely flexible and customizable!

## 🚀 What's New in v2

- **Interactive Configuration Wizard**: Start with a simple description, get a customized research plan
- **Works for ANY Topic**: Market research, academic literature reviews, competitive analysis, technology assessment, and more
- **Domain Templates**: Pre-built templates that adapt to your specific needs
- **Quality Review Agent**: Built-in quality assurance that reviews research completeness
- **Flexible Output Formats**: Choose from comparison, deep dive, recommendations, synthesis, or executive summary
- **Backward Compatible**: All original tools still work for existing workflows

## Features

- **Real AI-powered research** using Anthropic's Claude API
- **Interactive configuration** through conversational wizard
- **Parallel execution** of multiple research agents
- **Comprehensive analysis** across customizable dimensions
- **Quality assurance** with automated review and recommendations
- **Automatic synthesis** and actionable insights
- **Rate limiting** to respect API limits

## Installation

```bash
npm install
npm run build
```

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

## Quick Start Guide

### Step 1: Start Research Configuration

```javascript
// Describe what you want to research
await configureResearch({
  initialDescription: "I want to research sustainable packaging solutions for e-commerce"
})

// The wizard will respond with clarifying questions
```

### Step 2: Answer Questions

```javascript
// Continue the conversation
await continueConfiguration({
  sessionId: "your-session-id",
  userResponse: "I'm looking at this from an investment perspective, focusing on North American markets"
})
```

### Step 3: Generate Research Plan

```javascript
// Once configuration is complete
await generateResearchPlan({
  sessionId: "your-session-id",
  includeQualityReview: true
})

// Returns a detailed research plan with dimensions, criteria, and quality checks
```

### Step 4: Execute Research

```javascript
// Run the research with AI agents
await runFlexibleResearch({
  configId: "your-config-id",
  executionMode: "parallel",
  includeQualityReview: true
})

// Returns comprehensive findings, synthesis, and recommendations
```

## Example Research Scenarios

### Market Research
```
"Research market for AI code assistants"
→ Market size, competition, customer needs, trends
→ Investment recommendations with opportunity scores
```

### Academic Research
```
"Literature review on quantum computing applications"
→ Theoretical frameworks, methodologies, key findings
→ Research gaps and future directions
```

### Competitive Analysis
```
"Analyze competitors in meal kit delivery"
→ Feature comparison, pricing, market positioning
→ Strategic recommendations and differentiation opportunities
```

### Technology Assessment
```
"Evaluate Kubernetes vs Docker Swarm"
→ Technical capabilities, implementation factors
→ Adoption recommendations for your use case
```

## Available Tools

### New Flexible Research Tools

1. **configureResearch** - Start interactive research configuration
2. **continueConfiguration** - Continue configuration conversation
3. **generateResearchPlan** - Generate customized research plan
4. **runFlexibleResearch** - Execute research with quality review

### Legacy Tools (for LLM evaluation research)

1. **createResearchTask** - Create a research task
2. **defineEvaluationAreas** - Define areas to evaluate
3. **initializeSubagents** - Set up research agents
4. **runSubagentResearch** - Execute AI research
5. **synthesizeFindings** - Synthesize and compare findings
6. **getOpportunityRecommendation** - Get recommendations

## Claude Desktop Configuration

1. Find your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - Linux: `~/.config/Claude/claude_desktop_config.json`

2. Add the research-task server to your config:

```json
{
  "mcpServers": {
    "research-task": {
      "command": "node",
      "args": ["/Users/YOUR_USERNAME/research-task-mcp-server/dist/index-v2.js"],
      "env": {
        "ANTHROPIC_API_KEY": "sk-ant-api03-YOUR-API-KEY-HERE"
      }
    }
  }
}
```

3. Replace:
   - `/Users/YOUR_USERNAME/` with your actual path
   - `YOUR-API-KEY-HERE` with your Anthropic API key

4. Restart Claude Desktop for changes to take effect

## Research Templates

The system includes pre-built templates for:

- **Market Research**: Market size, competition, customers, trends
- **Academic Research**: Literature review, methodologies, findings, gaps
- **Competitive Analysis**: Competitor profiles, positioning, strategies
- **Technology Assessment**: Capabilities, readiness, implementation factors

Templates automatically adapt based on your specific requirements!

## Quality Assurance

Every research project includes:
- Completeness checks across all dimensions
- Bias and consistency validation
- Confidence scoring
- Specific improvement recommendations
- Optional quality review by dedicated AI agent

## Development

```bash
npm run dev    # Run with auto-reload
npm run build  # Build for production
npm start      # Run production build
```

## Architecture

```
┌─────────────────────┐
│ Configuration       │ ← Interactive wizard understands your needs
│ Wizard              │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Research Templates  │ ← Adapts to your specific domain
│ & Plan Generation   │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Flexible Research   │ ← Multiple AI agents work in parallel
│ Agents              │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Quality Review      │ ← Ensures comprehensive, unbiased results
│ Agent               │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│ Synthesis &         │ ← Actionable insights and recommendations
│ Recommendations     │
└─────────────────────┘
```

## Rate Limiting

The server automatically handles rate limiting:
- 10 requests per minute (default)
- Automatic queuing and retry
- Graceful handling of API limits

## Extending the System

To add new research domains:

1. Add domain to `ResearchDomain` type in `types-v2.ts`
2. Create template in `research-templates.ts`
3. Define default dimensions and quality checks
4. Add domain-specific keywords for auto-detection

## Requirements

- Node.js 18+
- Anthropic API key
- Claude Desktop (for MCP integration)
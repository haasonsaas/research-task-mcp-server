#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ResearchTaskManager } from './research-task-manager.js';
import { FlexibleResearchManager } from './flexible-research-manager.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error('Error: ANTHROPIC_API_KEY environment variable is required');
  console.error('Please set ANTHROPIC_API_KEY in your Claude Desktop configuration or create a .env file');
  process.exit(1);
}

const server = new Server(
  {
    name: 'research-task-mcp-server',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize both managers for backward compatibility
const taskManager = new ResearchTaskManager(apiKey);
const flexibleManager = new FlexibleResearchManager(apiKey);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // New flexible research tools
      {
        name: 'configureResearch',
        description: 'Start an interactive conversation to configure research for any topic',
        inputSchema: {
          type: 'object',
          properties: {
            initialDescription: { 
              type: 'string', 
              description: 'Initial description of what you want to research' 
            },
            suggestTemplates: { 
              type: 'boolean', 
              description: 'Whether to suggest research templates based on the description',
              default: true
            }
          },
          required: ['initialDescription']
        }
      },
      {
        name: 'continueConfiguration',
        description: 'Continue the research configuration conversation',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { 
              type: 'string', 
              description: 'Configuration session ID' 
            },
            userResponse: { 
              type: 'string', 
              description: 'Your response to the configuration questions' 
            }
          },
          required: ['sessionId', 'userResponse']
        }
      },
      {
        name: 'generateResearchPlan',
        description: 'Generate a research plan from the configuration conversation',
        inputSchema: {
          type: 'object',
          properties: {
            sessionId: { 
              type: 'string', 
              description: 'Configuration session ID' 
            },
            includeQualityReview: { 
              type: 'boolean', 
              description: 'Whether to include quality review in the plan',
              default: true
            }
          },
          required: ['sessionId']
        }
      },
      {
        name: 'runFlexibleResearch',
        description: 'Execute research based on a configured plan',
        inputSchema: {
          type: 'object',
          properties: {
            configId: { 
              type: 'string', 
              description: 'Research configuration ID' 
            },
            executionMode: {
              type: 'string',
              enum: ['parallel', 'sequential'],
              description: 'How to run research agents',
              default: 'parallel'
            },
            includeQualityReview: {
              type: 'boolean',
              description: 'Whether to perform quality review of results',
              default: true
            },
            maxAgents: {
              type: 'number',
              description: 'Maximum concurrent agents for parallel execution',
              default: 5
            }
          },
          required: ['configId']
        }
      },
      // Legacy tools for backward compatibility
      {
        name: 'createResearchTask',
        description: '[Legacy] Create a research task for LLM evaluation tools',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Title of the research task' },
            goal: { type: 'string', description: 'Goal of the research' },
            strategy: { type: 'string', description: 'Research strategy to use' }
          },
          required: ['title', 'goal', 'strategy']
        }
      },
      {
        name: 'defineEvaluationAreas',
        description: '[Legacy] Define evaluation areas for a research task',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'ID of the research task' },
            areas: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of evaluation areas to research'
            }
          },
          required: ['taskId', 'areas']
        }
      },
      {
        name: 'initializeSubagents',
        description: '[Legacy] Initialize subagents for parallel research execution',
        inputSchema: {
          type: 'object',
          properties: {
            parentTaskId: { type: 'string', description: 'Parent task ID' },
            subagents: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  area: { type: 'string' },
                  objectives: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                },
                required: ['area', 'objectives']
              }
            }
          },
          required: ['parentTaskId', 'subagents']
        }
      },
      {
        name: 'runSubagentResearch',
        description: '[Legacy] Execute subagent research in parallel or sequential mode',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID' },
            executionMode: {
              type: 'string',
              enum: ['parallel', 'sequential'],
              description: 'Execution mode for subagents'
            },
            depth: {
              type: 'string',
              enum: ['basic', 'comprehensive'],
              description: 'Research depth'
            },
            includeSources: {
              type: 'boolean',
              description: 'Include sources in results'
            }
          },
          required: ['taskId']
        }
      },
      {
        name: 'synthesizeFindings',
        description: '[Legacy] Synthesize findings from all subagent research',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID' },
            dimensionsToCompare: {
              type: 'array',
              items: { type: 'string' },
              description: 'Dimensions to compare across areas'
            },
            goal: { type: 'string', description: 'Synthesis goal' }
          },
          required: ['taskId', 'dimensionsToCompare', 'goal']
        }
      },
      {
        name: 'getOpportunityRecommendation',
        description: '[Legacy] Get the final opportunity recommendation',
        inputSchema: {
          type: 'object',
          properties: {
            taskId: { type: 'string', description: 'Task ID' }
          },
          required: ['taskId']
        }
      }
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    switch (request.params.name) {
      // New flexible research tools
      case 'configureResearch': {
        const { initialDescription, suggestTemplates = true } = request.params.arguments as any;
        const result = await flexibleManager.configureResearch({ 
          initialDescription, 
          suggestTemplates 
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId: result.sessionId,
                response: result.response,
                suggestedTemplate: result.suggestedTemplate,
                nextStep: 'Use continueConfiguration with the sessionId to answer the questions'
              }, null, 2),
            },
          ],
        };
      }

      case 'continueConfiguration': {
        const { sessionId, userResponse } = request.params.arguments as any;
        const result = await flexibleManager.continueConfiguration({ 
          sessionId, 
          userResponse 
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                response: result.response,
                configComplete: result.configComplete,
                extractedConfig: result.extractedConfig,
                nextStep: result.configComplete 
                  ? 'Use generateResearchPlan to create the research plan'
                  : 'Continue answering questions with continueConfiguration'
              }, null, 2),
            },
          ],
        };
      }

      case 'generateResearchPlan': {
        const { sessionId, includeQualityReview = true } = request.params.arguments as any;
        const result = await flexibleManager.generateResearchPlan({ 
          sessionId, 
          includeQualityReview 
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                configId: result.config.id,
                preview: result.preview,
                config: result.config,
                nextStep: 'Use runFlexibleResearch with the configId to execute the research'
              }, null, 2),
            },
          ],
        };
      }

      case 'runFlexibleResearch': {
        const { 
          configId, 
          executionMode = 'parallel', 
          includeQualityReview = true,
          maxAgents = 5 
        } = request.params.arguments as any;
        
        const result = await flexibleManager.runFlexibleResearch({ 
          configId, 
          executionMode, 
          includeQualityReview,
          maxAgents
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                task: result.task,
                synthesis: {
                  recommendations: result.synthesis.recommendations,
                  crossDimensionInsights: result.synthesis.crossDimensionInsights,
                  executiveSummary: result.synthesis.executiveSummary,
                  qualityScore: result.synthesis.qualityReview?.overallScore
                },
                fullResults: result.synthesis
              }, null, 2),
            },
          ],
        };
      }

      // Legacy tools
      case 'createResearchTask': {
        const { title, goal, strategy } = request.params.arguments as any;
        const task = await taskManager.createResearchTask({ title, goal, strategy });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      case 'defineEvaluationAreas': {
        const { taskId, areas } = request.params.arguments as any;
        const task = await taskManager.defineEvaluationAreas(taskId, { areas });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      }

      case 'initializeSubagents': {
        const { parentTaskId, subagents } = request.params.arguments as any;
        const agents = await taskManager.initializeSubagents({
          parent_task_id: parentTaskId,
          subagents,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(agents, null, 2),
            },
          ],
        };
      }

      case 'runSubagentResearch': {
        const { taskId, executionMode = 'parallel', depth = 'comprehensive', includeSources = true } = request.params.arguments as any;
        const results = await taskManager.runSubagentResearch(taskId, {
          execution_mode: executionMode,
          depth,
          include_sources: includeSources,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case 'synthesizeFindings': {
        const { taskId, dimensionsToCompare, goal } = request.params.arguments as any;
        const synthesis = await taskManager.synthesizeFindings(taskId, {
          dimensions_to_compare: dimensionsToCompare,
          goal,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(synthesis, null, 2),
            },
          ],
        };
      }

      case 'getOpportunityRecommendation': {
        const { taskId } = request.params.arguments as any;
        const recommendation = await taskManager.getOpportunityRecommendation(taskId);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(recommendation, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });

  await server.connect(transport);
  
  // Log successful startup to stderr (visible in MCP logs)
  console.error('Research Task MCP Server v2 started successfully');
  console.error('Now supports flexible research for any topic!');
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
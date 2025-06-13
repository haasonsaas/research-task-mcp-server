import { randomUUID } from 'crypto';
import {
  ResearchTask,
  ResearchConfig,
  FlexibleSubAgent,
  ResearchSynthesis,
  ConfigureResearchRequest,
  ContinueConfigurationRequest,
  GenerateResearchPlanRequest,
  ModifyResearchPlanRequest,
  RunFlexibleResearchRequest
} from './types.js';
import { ConfigurationWizard } from './configuration-wizard.js';
import { FlexibleResearchAgent } from './flexible-research-agent.js';
import { FlexibleSynthesisAgent } from './flexible-synthesis-agent.js';
import { QualityReviewAgent } from './quality-review-agent.js';

export class FlexibleResearchManager {
  private tasks: Map<string, ResearchTask> = new Map();
  private configs: Map<string, ResearchConfig> = new Map();
  private subAgents: Map<string, FlexibleSubAgent[]> = new Map();
  private syntheses: Map<string, ResearchSynthesis> = new Map();
  
  private configWizard: ConfigurationWizard;
  private researchAgent: FlexibleResearchAgent;
  private synthesisAgent: FlexibleSynthesisAgent;
  private qualityReviewAgent: QualityReviewAgent;

  constructor(apiKey: string) {
    this.configWizard = new ConfigurationWizard(apiKey);
    this.researchAgent = new FlexibleResearchAgent(apiKey);
    this.synthesisAgent = new FlexibleSynthesisAgent(apiKey);
    this.qualityReviewAgent = new QualityReviewAgent(apiKey);
  }

  // Configuration endpoints
  async configureResearch(request: ConfigureResearchRequest): Promise<{
    sessionId: string;
    response: string;
    suggestedTemplate?: string;
  }> {
    return await this.configWizard.startConfiguration(request.initialDescription);
  }

  async continueConfiguration(request: ContinueConfigurationRequest): Promise<{
    response: string;
    configComplete: boolean;
    extractedConfig?: Partial<ResearchConfig>;
  }> {
    return await this.configWizard.continueConfiguration(
      request.sessionId,
      request.userResponse
    );
  }

  async generateResearchPlan(request: GenerateResearchPlanRequest): Promise<{
    config: ResearchConfig;
    preview: string;
  }> {
    const config = await this.configWizard.generateResearchPlan(request.sessionId);
    this.configs.set(config.id, config);

    // Generate a preview of the research plan
    const preview = this.generatePlanPreview(config);

    return { config, preview };
  }

  async modifyResearchPlan(request: ModifyResearchPlanRequest): Promise<ResearchConfig> {
    const config = this.configs.get(request.planId);
    if (!config) {
      throw new Error(`Research plan ${request.planId} not found`);
    }

    // Apply modifications
    const updatedConfig: ResearchConfig = {
      ...config,
      ...request.modifications,
      context: {
        ...config.context,
        ...(request.modifications.context || {})
      }
    };

    this.configs.set(updatedConfig.id, updatedConfig);
    return updatedConfig;
  }

  // Legacy compatibility - create task from config
  async createResearchTaskFromConfig(configId: string): Promise<ResearchTask> {
    const config = this.configs.get(configId);
    if (!config) {
      throw new Error(`Config ${configId} not found`);
    }

    const task: ResearchTask = {
      id: randomUUID(),
      title: config.topic,
      goal: `Research ${config.topic} for ${config.context.audience.join(', ')}`,
      strategy: `${config.context.domain} research with ${config.outputFormat} output`,
      status: 'pending',
      areas: config.dimensions.map(d => d.name),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    
    // Initialize subagents from config
    const subAgents: FlexibleSubAgent[] = config.dimensions.map(dimension => ({
      id: randomUUID(),
      parentTaskId: task.id,
      dimension,
      status: 'pending'
    }));

    this.subAgents.set(task.id, subAgents);

    return task;
  }

  // Main research execution
  async runFlexibleResearch(request: RunFlexibleResearchRequest): Promise<{
    task: ResearchTask;
    synthesis: ResearchSynthesis;
  }> {
    const config = this.configs.get(request.configId);
    if (!config) {
      throw new Error(`Config ${request.configId} not found`);
    }

    // Create task from config
    const task = await this.createResearchTaskFromConfig(request.configId);
    task.status = 'in_progress';

    const subAgents = this.subAgents.get(task.id)!;

    // Execute research
    if (request.executionMode === 'parallel') {
      await this.runParallelResearch(subAgents, config, request.maxAgents);
    } else {
      await this.runSequentialResearch(subAgents, config);
    }

    // Collect results
    const dimensionResults: Record<string, any> = {};
    for (const agent of subAgents) {
      if (agent.results) {
        dimensionResults[agent.dimension.id] = agent.results;
      }
    }

    // Quality review if requested
    let qualityReview;
    if (request.includeQualityReview) {
      qualityReview = await this.qualityReviewAgent.reviewResearch(
        config,
        dimensionResults
      );
    }

    // Synthesize findings
    const synthesis = await this.synthesisAgent.synthesizeFindings(
      config,
      subAgents,
      qualityReview
    );

    task.status = 'completed';
    task.updatedAt = new Date();
    
    this.syntheses.set(task.id, synthesis);

    return { task, synthesis };
  }

  private async runParallelResearch(
    subAgents: FlexibleSubAgent[],
    config: ResearchConfig,
    maxConcurrent: number = 5
  ): Promise<void> {
    // Process in batches to respect rate limits
    for (let i = 0; i < subAgents.length; i += maxConcurrent) {
      const batch = subAgents.slice(i, i + maxConcurrent);
      
      await Promise.all(
        batch.map(async (agent) => {
          try {
            agent.status = 'running';
            agent.results = await this.researchAgent.performResearch(
              agent,
              config,
              'comprehensive',
              true
            );
            agent.status = 'completed';
          } catch (error) {
            agent.status = 'failed';
            console.error(`Agent ${agent.id} failed:`, error);
          }
        })
      );

      // Brief pause between batches
      if (i + maxConcurrent < subAgents.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private async runSequentialResearch(
    subAgents: FlexibleSubAgent[],
    config: ResearchConfig
  ): Promise<void> {
    for (const agent of subAgents) {
      try {
        agent.status = 'running';
        agent.results = await this.researchAgent.performResearch(
          agent,
          config,
          'comprehensive',
          true
        );
        agent.status = 'completed';
      } catch (error) {
        agent.status = 'failed';
        console.error(`Agent ${agent.id} failed:`, error);
      }
    }
  }

  private generatePlanPreview(config: ResearchConfig): string {
    let preview = `# Research Plan: ${config.topic}\n\n`;
    preview += `**Domain**: ${config.context.domain.replace('_', ' ')}\n`;
    preview += `**Audience**: ${config.context.audience.join(', ')}\n`;
    preview += `**Perspective**: ${config.context.perspective}\n`;
    preview += `**Output Format**: ${config.outputFormat.replace('_', ' ')}\n\n`;
    
    preview += `## Research Dimensions\n\n`;
    for (const dimension of config.dimensions) {
      preview += `### ${dimension.name}\n`;
      preview += `${dimension.description}\n`;
      preview += `- **Evaluation Criteria**: ${dimension.evaluationCriteria.join(', ')}\n`;
      preview += `- **Data Points**: ${dimension.dataPoints.join(', ')}\n`;
      preview += `- **Weight**: ${((dimension.weight || 0.2) * 100).toFixed(0)}%\n\n`;
    }

    preview += `## Quality Checks\n\n`;
    for (const check of config.qualityChecks) {
      preview += `- **${check.type}**: ${check.criteria.join(', ')} (threshold: ${check.threshold})\n`;
    }

    if (config.context.constraints) {
      preview += `\n## Constraints\n\n`;
      preview += JSON.stringify(config.context.constraints, null, 2);
    }

    return preview;
  }

  // Utility methods
  getTask(taskId: string): ResearchTask | undefined {
    return this.tasks.get(taskId);
  }

  getConfig(configId: string): ResearchConfig | undefined {
    return this.configs.get(configId);
  }

  getSynthesis(taskId: string): ResearchSynthesis | undefined {
    return this.syntheses.get(taskId);
  }

  getSession(sessionId: string) {
    return this.configWizard.getSession(sessionId);
  }
}
import { randomUUID } from 'crypto';
import {
  ResearchTask,
  SubAgent,
  SubAgentResults,
  TaskSynthesis,
  TaskRecommendation,
  CreateResearchTaskRequest,
  DefineEvaluationAreasRequest,
  InitializeSubagentsRequest,
  RunSubagentResearchRequest,
  SynthesizeFindingsRequest,
} from './types.js';
import { ClaudeResearchAgent } from './claude-research-agent.js';
import { SynthesisAgent } from './synthesis-agent.js';

export class ResearchTaskManager {
  private tasks: Map<string, ResearchTask> = new Map();
  private subAgents: Map<string, SubAgent[]> = new Map();
  private syntheses: Map<string, TaskSynthesis> = new Map();
  private researchAgent: ClaudeResearchAgent;
  private synthesisAgent: SynthesisAgent;

  constructor(apiKey: string) {
    this.researchAgent = new ClaudeResearchAgent(apiKey);
    this.synthesisAgent = new SynthesisAgent(apiKey);
  }

  async createResearchTask(request: CreateResearchTaskRequest): Promise<ResearchTask> {
    const task: ResearchTask = {
      id: randomUUID(),
      title: request.title,
      goal: request.goal,
      strategy: request.strategy,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);
    return task;
  }

  async defineEvaluationAreas(taskId: string, request: DefineEvaluationAreasRequest): Promise<ResearchTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.areas = request.areas;
    task.updatedAt = new Date();
    
    return task;
  }

  async initializeSubagents(request: InitializeSubagentsRequest): Promise<SubAgent[]> {
    const task = this.tasks.get(request.parent_task_id);
    if (!task) {
      throw new Error(`Task ${request.parent_task_id} not found`);
    }

    const subAgents: SubAgent[] = request.subagents.map(sa => ({
      id: randomUUID(),
      parentTaskId: request.parent_task_id,
      area: sa.area,
      objectives: sa.objectives,
      status: 'pending',
    }));

    this.subAgents.set(request.parent_task_id, subAgents);
    
    task.status = 'in_progress';
    task.updatedAt = new Date();

    return subAgents;
  }

  async runSubagentResearch(
    taskId: string,
    request: RunSubagentResearchRequest
  ): Promise<SubAgent[]> {
    const subAgents = this.subAgents.get(taskId);
    if (!subAgents) {
      throw new Error(`No subagents found for task ${taskId}`);
    }

    const researchPromises = subAgents.map(async (agent) => {
      try {
        agent.status = 'running';
        
        // Use Claude to perform actual research
        const results = await this.researchAgent.performResearch(
          agent,
          request.depth,
          request.include_sources
        );
        
        agent.status = 'completed';
        agent.results = results;
      } catch (error) {
        agent.status = 'failed';
        console.error(`Failed to research ${agent.area}:`, error);
      }
      
      return agent;
    });

    if (request.execution_mode === 'parallel') {
      await Promise.all(researchPromises);
    } else {
      for (const promise of researchPromises) {
        await promise;
      }
    }

    return subAgents;
  }

  async synthesizeFindings(
    taskId: string,
    request: SynthesizeFindingsRequest
  ): Promise<TaskSynthesis> {
    const subAgents = this.subAgents.get(taskId);
    if (!subAgents) {
      throw new Error(`No subagents found for task ${taskId}`);
    }

    const completedAgents = subAgents.filter(a => a.status === 'completed');
    if (completedAgents.length === 0) {
      throw new Error('No completed subagent research to synthesize');
    }

    // Use Claude to synthesize the findings
    const { synthesis, recommendation } = await this.synthesisAgent.synthesizeFindings(
      completedAgents,
      request.dimensions_to_compare,
      request.goal
    );

    this.syntheses.set(taskId, synthesis);
    return synthesis;
  }

  async getOpportunityRecommendation(taskId: string): Promise<TaskRecommendation> {
    const synthesis = this.syntheses.get(taskId);
    if (!synthesis) {
      throw new Error(`No synthesis found for task ${taskId}`);
    }

    if (!synthesis.recommendation) {
      throw new Error('No recommendation available. Please run synthesizeFindings first.');
    }

    return synthesis.recommendation;
  }
}
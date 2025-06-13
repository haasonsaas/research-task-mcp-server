// Legacy compatibility type
export interface ResearchTask {
  id: string;
  title: string;
  goal: string;
  strategy: string;
  status: 'pending' | 'in_progress' | 'completed';
  areas?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ResearchDomain = 
  | 'market_research'
  | 'academic_research'
  | 'competitive_analysis'
  | 'technology_assessment'
  | 'policy_research'
  | 'investment_analysis'
  | 'custom';

export type OutputFormat = 
  | 'comparison'
  | 'deep_dive'
  | 'recommendation'
  | 'survey'
  | 'synthesis'
  | 'executive_summary';

export interface ResearchDimension {
  id: string;
  name: string;
  description: string;
  evaluationCriteria: string[];
  dataPoints: string[];
  weight?: number;
}

export interface ResearchConfig {
  id: string;
  topic: string;
  context: {
    domain: ResearchDomain;
    audience: string[];
    perspective: string;
    constraints?: Record<string, any>;
  };
  dimensions: ResearchDimension[];
  outputFormat: OutputFormat;
  qualityChecks: QualityCheckConfig[];
}

export interface QualityCheckConfig {
  type: 'completeness' | 'accuracy' | 'bias' | 'consistency' | 'depth';
  criteria: string[];
  threshold: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  extractedInfo?: Partial<ResearchConfig>;
}

export interface ConversationState {
  sessionId: string;
  turns: ConversationTurn[];
  extractedConfig?: Partial<ResearchConfig>;
  clarificationNeeded: string[];
  suggestedTemplate?: string;
  status: 'active' | 'completed' | 'abandoned';
}

export interface ResearchTemplate {
  id: string;
  name: string;
  domain: ResearchDomain;
  description: string;
  defaultDimensions: ResearchDimension[];
  defaultAudience: string[];
  defaultQualityChecks: QualityCheckConfig[];
  exampleQuestions: string[];
}

export interface FlexibleSubAgent {
  id: string;
  parentTaskId: string;
  dimension: ResearchDimension;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: DimensionResults;
}

export interface DimensionResults {
  dimensionId: string;
  findings: Record<string, any>;
  evidence: string[];
  confidence: number;
  sources?: string[];
  metadata?: Record<string, any>;
}

export interface QualityReviewResult {
  overallScore: number;
  dimensionScores: Record<string, number>;
  issues: {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion?: string;
  }[];
  recommendations: string[];
  confidence: number;
}

export interface ResearchSynthesis {
  taskId: string;
  config: ResearchConfig;
  dimensionFindings: Record<string, DimensionResults>;
  crossDimensionInsights: string[];
  recommendations: {
    primary: string;
    supporting: string[];
    confidence: number;
  };
  executiveSummary?: string;
  qualityReview?: QualityReviewResult;
}

// API Request Types
export interface ConfigureResearchRequest {
  initialDescription: string;
  suggestTemplates?: boolean;
}

export interface ContinueConfigurationRequest {
  sessionId: string;
  userResponse: string;
}

export interface GenerateResearchPlanRequest {
  sessionId: string;
  includeQualityReview?: boolean;
}

export interface ModifyResearchPlanRequest {
  planId: string;
  modifications: Partial<ResearchConfig>;
}

export interface RunFlexibleResearchRequest {
  configId: string;
  executionMode: 'parallel' | 'sequential';
  includeQualityReview: boolean;
  maxAgents?: number;
}

// Legacy types for backward compatibility
export interface SubAgent {
  id: string;
  parentTaskId: string;
  area: string;
  objectives: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: SubAgentResults;
}

export interface SubAgentResults {
  toolCoverage: {
    existingSolutions: string[];
    gaps: string[];
  };
  enterpriseDemand: {
    signals: string[];
    intensity: 'low' | 'medium' | 'high';
  };
  fundingActivity: {
    recentFunding: string[];
    developerActivity: string[];
  };
  painPoints: {
    sources: string[];
    severity: 'low' | 'medium' | 'high';
  };
  revenueAnalysis: {
    potentialRevenue: string;
    viablePricingModels: string[];
  };
  sources?: string[];
}

export interface TaskSynthesis {
  taskId: string;
  dimensionComparisons: {
    [dimension: string]: {
      [area: string]: any;
    };
  };
  rankings: {
    area: string;
    painToSolutionRatio: number;
    feasibilityScore: number;
    overallScore: number;
  }[];
  recommendation?: TaskRecommendation;
}

export interface TaskRecommendation {
  recommendedArea: string;
  reasoning: string;
  confidence: number;
}

export interface CreateResearchTaskRequest {
  title: string;
  goal: string;
  strategy: string;
}

export interface DefineEvaluationAreasRequest {
  areas: string[];
}

export interface InitializeSubagentsRequest {
  parent_task_id: string;
  subagents: {
    area: string;
    objectives: string[];
  }[];
}

export interface RunSubagentResearchRequest {
  execution_mode: 'parallel' | 'sequential';
  depth: 'basic' | 'comprehensive';
  include_sources: boolean;
}

export interface SynthesizeFindingsRequest {
  dimensions_to_compare: string[];
  goal: string;
}
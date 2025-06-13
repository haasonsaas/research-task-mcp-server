import { randomUUID } from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import {
  ConversationState,
  ConversationTurn,
  ResearchConfig,
  ResearchDimension,
  QualityCheckConfig,
  ResearchDomain,
  OutputFormat
} from './types.js';
import { suggestTemplate, getTemplate } from './research-templates.js';
import { RateLimiter } from './rate-limiter.js';

export class ConfigurationWizard {
  private conversations: Map<string, ConversationState> = new Map();
  private anthropic: Anthropic;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.rateLimiter = new RateLimiter(10, 60000);
  }

  async startConfiguration(initialDescription: string): Promise<{
    sessionId: string;
    response: string;
    suggestedTemplate?: string;
  }> {
    const sessionId = randomUUID();
    const suggestedDomain = suggestTemplate(initialDescription);
    
    const state: ConversationState = {
      sessionId,
      turns: [{
        role: 'user',
        content: initialDescription,
        timestamp: new Date()
      }],
      extractedConfig: {
        topic: initialDescription,
        context: {
          domain: suggestedDomain as ResearchDomain || 'custom',
          audience: [],
          perspective: ''
        },
        dimensions: [],
        outputFormat: 'synthesis',
        qualityChecks: []
      },
      clarificationNeeded: [],
      suggestedTemplate: suggestedDomain,
      status: 'active'
    };

    this.conversations.set(sessionId, state);

    const systemPrompt = `You are a research configuration assistant helping users define their research needs.
Your goal is to understand their requirements and build a comprehensive research configuration.

Current understanding:
- Topic: ${initialDescription}
- Suggested domain: ${suggestedDomain || 'custom'}

Ask clarifying questions to understand:
1. The specific research goals
2. Target audience and their needs
3. Key aspects/dimensions to investigate
4. Desired output format and depth
5. Any constraints or special requirements

Be conversational but efficient. Ask 2-3 focused questions at a time.
${suggestedDomain ? `\nNote: Based on the description, this seems like ${suggestedDomain.replace('_', ' ')} research.` : ''}`;

    const userPrompt = `The user wants to research: "${initialDescription}"

Generate 2-3 clarifying questions to better understand their needs. Be specific and helpful.`;

    await this.rateLimiter.waitIfNeeded();
    
    const completion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const response = completion.content[0].type === 'text' ? completion.content[0].text : '';
    
    state.turns.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    return {
      sessionId,
      response,
      suggestedTemplate: suggestedDomain
    };
  }

  async continueConfiguration(sessionId: string, userResponse: string): Promise<{
    response: string;
    configComplete: boolean;
    extractedConfig?: Partial<ResearchConfig>;
  }> {
    const state = this.conversations.get(sessionId);
    if (!state || state.status !== 'active') {
      throw new Error('Invalid or expired session');
    }

    state.turns.push({
      role: 'user',
      content: userResponse,
      timestamp: new Date()
    });

    const conversationHistory = state.turns
      .map(turn => `${turn.role}: ${turn.content}`)
      .join('\n\n');

    const systemPrompt = `You are a research configuration assistant. Based on the conversation, extract and update the research configuration.

Current configuration:
${JSON.stringify(state.extractedConfig, null, 2)}

Your tasks:
1. Extract new information from the user's response
2. Update the configuration accordingly
3. Identify what key information is still missing
4. Ask follow-up questions or confirm the configuration is complete

If you have enough information to proceed, summarize the configuration and ask for confirmation.`;

    const userPrompt = `Conversation history:
${conversationHistory}

Based on this conversation:
1. Extract configuration details from the latest response
2. Determine what's still needed
3. Generate appropriate follow-up questions or confirmation`;

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1500,
      temperature: 0.6,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const response = completion.content[0].type === 'text' ? completion.content[0].text : '';
    
    state.turns.push({
      role: 'assistant',
      content: response,
      timestamp: new Date()
    });

    // Extract configuration updates using another Claude call
    const extractionPrompt = `Extract structured configuration from this conversation:
${conversationHistory}

Return a JSON object with these fields (only include fields that were clearly specified):
{
  "domain": "market_research|academic_research|competitive_analysis|etc",
  "audience": ["array of audience types mentioned"],
  "perspective": "business|technical|academic|etc",
  "dimensions": ["array of research aspects to investigate"],
  "outputFormat": "comparison|deep_dive|recommendation|etc",
  "constraints": {"any": "mentioned constraints"},
  "isComplete": true/false
}`;

    const extractionCompletion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0,
      messages: [{ role: 'user', content: extractionPrompt }]
    });

    try {
      const extractedJson = JSON.parse(
        extractionCompletion.content[0].type === 'text' 
          ? extractionCompletion.content[0].text 
          : '{}'
      );

      // Update configuration
      if (extractedJson.domain) {
        state.extractedConfig!.context!.domain = extractedJson.domain;
      }
      if (extractedJson.audience?.length) {
        state.extractedConfig!.context!.audience = extractedJson.audience;
      }
      if (extractedJson.perspective) {
        state.extractedConfig!.context!.perspective = extractedJson.perspective;
      }
      if (extractedJson.outputFormat) {
        state.extractedConfig!.outputFormat = extractedJson.outputFormat;
      }
      if (extractedJson.constraints) {
        state.extractedConfig!.context!.constraints = extractedJson.constraints;
      }

      const configComplete = extractedJson.isComplete || false;
      if (configComplete) {
        state.status = 'completed';
      }

      return {
        response,
        configComplete,
        extractedConfig: state.extractedConfig
      };
    } catch (error) {
      return {
        response,
        configComplete: false,
        extractedConfig: state.extractedConfig
      };
    }
  }

  async generateResearchPlan(sessionId: string): Promise<ResearchConfig> {
    const state = this.conversations.get(sessionId);
    if (!state) {
      throw new Error('Session not found');
    }

    const template = state.suggestedTemplate 
      ? getTemplate(state.suggestedTemplate) 
      : undefined;

    // Build dimensions based on template or conversation
    let dimensions: ResearchDimension[] = [];
    
    if (template && state.extractedConfig?.context?.domain === template.domain) {
      dimensions = template.defaultDimensions;
    } else {
      // Generate custom dimensions based on conversation
      dimensions = await this.generateCustomDimensions(state);
    }

    // Build quality checks
    const qualityChecks: QualityCheckConfig[] = template?.defaultQualityChecks || [
      {
        type: 'completeness',
        criteria: ['All dimensions covered', 'Sufficient depth', 'Key questions answered'],
        threshold: 0.8
      },
      {
        type: 'consistency',
        criteria: ['Internal consistency', 'Source agreement', 'Logic validity'],
        threshold: 0.85
      },
      {
        type: 'bias',
        criteria: ['Source diversity', 'Perspective balance', 'Confirmation bias check'],
        threshold: 0.75
      }
    ];

    const config: ResearchConfig = {
      id: randomUUID(),
      topic: state.extractedConfig!.topic!,
      context: {
        domain: state.extractedConfig!.context!.domain || 'custom',
        audience: state.extractedConfig!.context!.audience || ['general'],
        perspective: state.extractedConfig!.context!.perspective || 'balanced',
        constraints: state.extractedConfig!.context!.constraints
      },
      dimensions,
      outputFormat: state.extractedConfig!.outputFormat || 'synthesis',
      qualityChecks
    };

    return config;
  }

  private async generateCustomDimensions(state: ConversationState): Promise<ResearchDimension[]> {
    const conversationSummary = state.turns
      .map(t => `${t.role}: ${t.content}`)
      .join('\n');

    const prompt = `Based on this research discussion, generate 3-5 research dimensions.

Conversation:
${conversationSummary}

For each dimension, provide:
1. A clear name
2. A description
3. 3-4 evaluation criteria
4. 3-4 specific data points to collect

Return as JSON array of dimension objects.`;

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    try {
      const dimensions = JSON.parse(
        completion.content[0].type === 'text' 
          ? completion.content[0].text 
          : '[]'
      );

      return dimensions.map((dim: any, index: number) => ({
        id: `dimension_${index + 1}`,
        name: dim.name || `Dimension ${index + 1}`,
        description: dim.description || '',
        evaluationCriteria: dim.evaluationCriteria || [],
        dataPoints: dim.dataPoints || [],
        weight: 1 / dimensions.length
      }));
    } catch (error) {
      // Fallback dimensions
      return [
        {
          id: 'dimension_1',
          name: 'Core Analysis',
          description: 'Primary research focus area',
          evaluationCriteria: ['Relevance', 'Depth', 'Evidence quality'],
          dataPoints: ['Key findings', 'Supporting data', 'Examples'],
          weight: 0.4
        },
        {
          id: 'dimension_2',
          name: 'Context & Background',
          description: 'Contextual information and background',
          evaluationCriteria: ['Comprehensiveness', 'Relevance', 'Currency'],
          dataPoints: ['Historical context', 'Current state', 'Related factors'],
          weight: 0.3
        },
        {
          id: 'dimension_3',
          name: 'Implications & Applications',
          description: 'Practical implications and applications',
          evaluationCriteria: ['Practicality', 'Impact', 'Feasibility'],
          dataPoints: ['Use cases', 'Benefits', 'Challenges', 'Recommendations'],
          weight: 0.3
        }
      ];
    }
  }

  getSession(sessionId: string): ConversationState | undefined {
    return this.conversations.get(sessionId);
  }
}
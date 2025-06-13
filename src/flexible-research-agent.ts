import Anthropic from '@anthropic-ai/sdk';
import { 
  FlexibleSubAgent, 
  DimensionResults, 
  ResearchConfig,
  ResearchDimension 
} from './types.js';
import { RateLimiter } from './rate-limiter.js';

export class FlexibleResearchAgent {
  private anthropic: Anthropic;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.rateLimiter = new RateLimiter(10, 60000);
  }

  async performResearch(
    agent: FlexibleSubAgent,
    config: ResearchConfig,
    depth: 'basic' | 'comprehensive',
    includeSources: boolean
  ): Promise<DimensionResults> {
    const systemPrompt = this.generateSystemPrompt(config, agent.dimension);
    const userPrompt = this.generateResearchPrompt(config, agent.dimension, depth, includeSources);

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const responseText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : '';

    // Parse the research results
    const results = await this.parseResearchResults(
      responseText, 
      agent.dimension,
      config
    );

    return results;
  }

  private generateSystemPrompt(config: ResearchConfig, dimension: ResearchDimension): string {
    const audienceContext = config.context.audience.length > 0
      ? `The research is intended for: ${config.context.audience.join(', ')}.`
      : '';

    const perspectiveContext = config.context.perspective
      ? `Approach this from a ${config.context.perspective} perspective.`
      : '';

    const constraintContext = config.context.constraints
      ? `Consider these constraints: ${JSON.stringify(config.context.constraints)}`
      : '';

    return `You are an expert research analyst specializing in ${config.context.domain.replace('_', ' ')}.
Your task is to research "${config.topic}" focusing specifically on: ${dimension.name}

${dimension.description}

${audienceContext}
${perspectiveContext}
${constraintContext}

You should evaluate this dimension using these criteria:
${dimension.evaluationCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Focus on providing actionable, evidence-based insights that directly address the research goals.`;
  }

  private generateResearchPrompt(
    config: ResearchConfig,
    dimension: ResearchDimension,
    depth: 'basic' | 'comprehensive',
    includeSources: boolean
  ): string {
    const depthInstructions = depth === 'comprehensive'
      ? 'Provide a thorough, detailed analysis with extensive examples and evidence.'
      : 'Provide a focused analysis covering the key points efficiently.';

    const dataPointsSection = dimension.dataPoints.length > 0
      ? `\nSpecifically address these data points:\n${dimension.dataPoints.map((dp, i) => `${i + 1}. ${dp}`).join('\n')}`
      : '';

    const sourceInstructions = includeSources
      ? '\nInclude relevant sources, references, or examples where applicable.'
      : '';

    return `Research "${config.topic}" for the dimension: ${dimension.name}

${depthInstructions}

Your research should:
1. Address each evaluation criterion with specific findings
2. Provide concrete evidence and examples
3. Identify patterns, trends, or insights
4. Consider the needs of the target audience
5. Stay within the defined scope and constraints
${dataPointsSection}
${sourceInstructions}

Format your response as a comprehensive analysis that can be synthesized with other research dimensions.`;
  }

  private async parseResearchResults(
    responseText: string,
    dimension: ResearchDimension,
    config: ResearchConfig
  ): Promise<DimensionResults> {
    // Use Claude to structure the research results
    const structuringPrompt = `Extract and structure the research findings from this text:

${responseText}

Create a JSON object with:
1. findings: An object organizing the key findings by theme
2. evidence: Array of specific evidence, examples, or data points
3. confidence: A score from 0-1 indicating confidence in the findings
4. sources: Array of any mentioned sources or references
5. metadata: Any additional relevant information

Ensure the structure aligns with the dimension: ${dimension.name}`;

    await this.rateLimiter.waitIfNeeded();

    const structuredCompletion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: 'user', content: structuringPrompt }]
    });

    try {
      const structured = JSON.parse(
        structuredCompletion.content[0].type === 'text'
          ? structuredCompletion.content[0].text
          : '{}'
      );

      return {
        dimensionId: dimension.id,
        findings: structured.findings || { raw: responseText },
        evidence: structured.evidence || [],
        confidence: structured.confidence || 0.7,
        sources: structured.sources || [],
        metadata: {
          ...structured.metadata,
          researchDepth: 'comprehensive',
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      // Fallback structure
      return {
        dimensionId: dimension.id,
        findings: {
          raw: responseText,
          summary: responseText.substring(0, 500) + '...'
        },
        evidence: [],
        confidence: 0.6,
        sources: [],
        metadata: {
          parseError: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}
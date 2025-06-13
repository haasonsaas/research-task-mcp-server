import Anthropic from '@anthropic-ai/sdk';
import {
  ResearchConfig,
  FlexibleSubAgent,
  DimensionResults,
  ResearchSynthesis,
  QualityReviewResult
} from './types.js';
import { RateLimiter } from './rate-limiter.js';

export class FlexibleSynthesisAgent {
  private anthropic: Anthropic;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.rateLimiter = new RateLimiter(10, 60000);
  }

  async synthesizeFindings(
    config: ResearchConfig,
    subAgents: FlexibleSubAgent[],
    qualityReview?: QualityReviewResult
  ): Promise<ResearchSynthesis> {
    const completedAgents = subAgents.filter(a => a.status === 'completed' && a.results);
    const dimensionFindings: Record<string, DimensionResults> = {};
    
    for (const agent of completedAgents) {
      if (agent.results) {
        dimensionFindings[agent.dimension.id] = agent.results;
      }
    }

    const systemPrompt = this.generateSynthesisSystemPrompt(config);
    const userPrompt = this.generateSynthesisUserPrompt(config, dimensionFindings, qualityReview);

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      temperature: 0.5,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const synthesisText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : '';

    // Parse synthesis into structured format
    const synthesis = await this.parseSynthesis(
      synthesisText,
      config,
      dimensionFindings,
      qualityReview
    );

    // Generate executive summary if needed
    if (config.outputFormat === 'executive_summary' || config.outputFormat === 'synthesis') {
      synthesis.executiveSummary = await this.generateExecutiveSummary(
        config,
        synthesis
      );
    }

    return synthesis;
  }

  private generateSynthesisSystemPrompt(config: ResearchConfig): string {
    const outputInstructions = this.getOutputFormatInstructions(config.outputFormat);
    
    return `You are an expert research synthesizer specializing in ${config.context.domain.replace('_', ' ')}.

Your role is to:
1. Integrate findings across all research dimensions
2. Identify patterns, connections, and insights
3. ${outputInstructions}
4. Consider the target audience: ${config.context.audience.join(', ')}
5. Maintain the ${config.context.perspective} perspective

Focus on actionable insights and clear communication.`;
  }

  private generateSynthesisUserPrompt(
    config: ResearchConfig,
    dimensionFindings: Record<string, DimensionResults>,
    qualityReview?: QualityReviewResult
  ): string {
    let prompt = `Synthesize research findings for: "${config.topic}"\n\n`;
    
    // Add dimension findings
    prompt += `Research Findings by Dimension:\n\n`;
    for (const dimension of config.dimensions) {
      const results = dimensionFindings[dimension.id];
      if (results) {
        prompt += `### ${dimension.name} (Weight: ${dimension.weight || 'equal'})\n`;
        prompt += `Confidence: ${results.confidence}\n`;
        prompt += `Key Findings:\n${JSON.stringify(results.findings, null, 2)}\n`;
        prompt += `Evidence Points: ${results.evidence.join('; ')}\n\n`;
      }
    }

    // Add quality review if available
    if (qualityReview) {
      prompt += `\nQuality Review:\n`;
      prompt += `Overall Score: ${qualityReview.overallScore}\n`;
      prompt += `Key Issues: ${qualityReview.issues.map(i => i.description).join('; ')}\n`;
      prompt += `Recommendations: ${qualityReview.recommendations.join('; ')}\n\n`;
    }

    // Add specific synthesis instructions
    prompt += `\nProvide a comprehensive synthesis that:\n`;
    prompt += `1. Integrates findings across all dimensions\n`;
    prompt += `2. Highlights key insights and patterns\n`;
    prompt += `3. Addresses any quality concerns\n`;
    prompt += `4. Provides clear recommendations\n`;
    prompt += `5. Formats output as: ${config.outputFormat}\n`;

    return prompt;
  }

  private getOutputFormatInstructions(format: string): string {
    const instructions: Record<string, string> = {
      comparison: 'Create detailed comparisons across dimensions and options',
      deep_dive: 'Provide in-depth analysis with comprehensive details',
      recommendation: 'Focus on actionable recommendations with supporting rationale',
      survey: 'Present a broad overview covering all key aspects',
      synthesis: 'Integrate findings into a cohesive narrative with insights',
      executive_summary: 'Create a concise summary for executive decision-making'
    };

    return instructions[format] || 'Provide a comprehensive analysis';
  }

  private async parseSynthesis(
    synthesisText: string,
    config: ResearchConfig,
    dimensionFindings: Record<string, DimensionResults>,
    qualityReview?: QualityReviewResult
  ): Promise<ResearchSynthesis> {
    const structuringPrompt = `Extract structured synthesis from this text:

${synthesisText}

Create a JSON object with:
{
  "crossDimensionInsights": ["array of key insights connecting multiple dimensions"],
  "recommendations": {
    "primary": "main recommendation",
    "supporting": ["array of supporting recommendations"],
    "confidence": <number 0-1>
  }
}`;

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
        taskId: config.id,
        config,
        dimensionFindings,
        crossDimensionInsights: structured.crossDimensionInsights || [
          'Research reveals consistent patterns across dimensions',
          'Multiple factors contribute to the overall findings'
        ],
        recommendations: structured.recommendations || {
          primary: 'Based on the research, the primary recommendation is to proceed with careful consideration of identified factors',
          supporting: ['Monitor emerging trends', 'Address identified gaps', 'Leverage opportunities'],
          confidence: 0.75
        },
        qualityReview
      };
    } catch (error) {
      // Fallback synthesis
      return {
        taskId: config.id,
        config,
        dimensionFindings,
        crossDimensionInsights: [synthesisText.substring(0, 200) + '...'],
        recommendations: {
          primary: 'Further analysis recommended',
          supporting: ['Review findings in detail', 'Consider additional research'],
          confidence: 0.6
        },
        qualityReview
      };
    }
  }

  private async generateExecutiveSummary(
    config: ResearchConfig,
    synthesis: ResearchSynthesis
  ): Promise<string> {
    const prompt = `Create a concise executive summary for this research:

Topic: ${config.topic}
Audience: ${config.context.audience.join(', ')}

Key Insights:
${synthesis.crossDimensionInsights.join('\n')}

Primary Recommendation: ${synthesis.recommendations.primary}
Supporting Recommendations: ${synthesis.recommendations.supporting.join('; ')}

Quality Score: ${synthesis.qualityReview?.overallScore || 'N/A'}

Create a 3-4 paragraph executive summary that:
1. States the research objective
2. Highlights 2-3 key findings
3. Provides clear recommendations
4. Notes any important caveats or limitations`;

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }]
    });

    return completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : 'Executive summary generation failed.';
  }

  async generateCustomOutput(
    synthesis: ResearchSynthesis,
    outputTemplate: string
  ): Promise<string> {
    const prompt = `Transform this research synthesis into the requested format:

${JSON.stringify(synthesis, null, 2)}

Output Template/Requirements:
${outputTemplate}

Generate the output according to the template while maintaining accuracy and insights.`;

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 3000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });

    return completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : 'Custom output generation failed.';
  }
}
import Anthropic from '@anthropic-ai/sdk';
import {
  ResearchConfig,
  DimensionResults,
  QualityReviewResult,
  QualityCheckConfig
} from './types.js';
import { RateLimiter } from './rate-limiter.js';

export class QualityReviewAgent {
  private anthropic: Anthropic;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
    this.rateLimiter = new RateLimiter(10, 60000);
  }

  async reviewResearch(
    config: ResearchConfig,
    dimensionResults: Record<string, DimensionResults>
  ): Promise<QualityReviewResult> {
    const systemPrompt = `You are a research quality assurance specialist. Your role is to:
1. Evaluate the completeness and quality of research findings
2. Identify potential biases, gaps, or inconsistencies
3. Assess the reliability and strength of evidence
4. Provide constructive recommendations for improvement

Research topic: ${config.topic}
Research domain: ${config.context.domain}
Target audience: ${config.context.audience.join(', ')}`;

    const researchSummary = this.summarizeResearch(config, dimensionResults);

    const userPrompt = `Review this research and provide a quality assessment:

${researchSummary}

Quality criteria to evaluate:
${config.qualityChecks.map(qc => `- ${qc.type}: ${qc.criteria.join(', ')}`).join('\n')}

Provide:
1. Overall quality score (0-1)
2. Individual dimension scores
3. Identified issues with severity levels
4. Specific recommendations for improvement
5. Confidence in the assessment`;

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 3000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const reviewText = completion.content[0].type === 'text' 
      ? completion.content[0].text 
      : '';

    return await this.parseQualityReview(reviewText, config, dimensionResults);
  }

  private summarizeResearch(
    config: ResearchConfig,
    dimensionResults: Record<string, DimensionResults>
  ): string {
    let summary = `Research Configuration:\n`;
    summary += `- Topic: ${config.topic}\n`;
    summary += `- Domain: ${config.context.domain}\n`;
    summary += `- Perspective: ${config.context.perspective}\n\n`;

    summary += `Research Findings by Dimension:\n\n`;

    for (const dimension of config.dimensions) {
      const results = dimensionResults[dimension.id];
      if (results) {
        summary += `### ${dimension.name}\n`;
        summary += `Description: ${dimension.description}\n`;
        summary += `Confidence: ${results.confidence}\n`;
        summary += `Key Findings:\n`;
        summary += JSON.stringify(results.findings, null, 2) + '\n';
        summary += `Evidence Points: ${results.evidence.length}\n`;
        summary += `Sources: ${results.sources?.length || 0}\n\n`;
      }
    }

    return summary;
  }

  private async parseQualityReview(
    reviewText: string,
    config: ResearchConfig,
    dimensionResults: Record<string, DimensionResults>
  ): Promise<QualityReviewResult> {
    const structuringPrompt = `Extract structured quality review data from this assessment:

${reviewText}

Create a JSON object with:
{
  "overallScore": <number 0-1>,
  "dimensionScores": {
    "<dimension_id>": <score 0-1>
  },
  "issues": [
    {
      "type": "string",
      "severity": "low|medium|high",
      "description": "string",
      "suggestion": "optional string"
    }
  ],
  "recommendations": ["array of recommendation strings"],
  "confidence": <number 0-1>
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

      // Validate against quality check thresholds
      const qualityIssues = this.checkQualityThresholds(
        config.qualityChecks,
        structured.overallScore || 0.7
      );

      return {
        overallScore: structured.overallScore || 0.7,
        dimensionScores: structured.dimensionScores || 
          Object.fromEntries(config.dimensions.map(d => [d.id, 0.7])),
        issues: [
          ...(structured.issues || []),
          ...qualityIssues
        ],
        recommendations: structured.recommendations || [
          'Consider expanding research scope',
          'Verify findings with additional sources',
          'Add more specific examples'
        ],
        confidence: structured.confidence || 0.8
      };
    } catch (error) {
      // Fallback review
      return {
        overallScore: 0.7,
        dimensionScores: Object.fromEntries(
          config.dimensions.map(d => [d.id, 0.7])
        ),
        issues: [{
          type: 'parse_error',
          severity: 'low',
          description: 'Could not fully parse quality review',
          suggestion: 'Manual review may be needed'
        }],
        recommendations: [
          'Review research completeness',
          'Verify evidence quality',
          'Check for potential biases'
        ],
        confidence: 0.6
      };
    }
  }

  private checkQualityThresholds(
    qualityChecks: QualityCheckConfig[],
    overallScore: number
  ): Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestion?: string;
  }> {
    const issues: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      suggestion?: string;
    }> = [];

    for (const check of qualityChecks) {
      if (overallScore < check.threshold) {
        const severity = 
          overallScore < check.threshold * 0.7 ? 'high' :
          overallScore < check.threshold * 0.9 ? 'medium' : 'low';

        issues.push({
          type: check.type,
          severity,
          description: `Quality check '${check.type}' below threshold (${overallScore.toFixed(2)} < ${check.threshold})`,
          suggestion: `Review ${check.criteria.join(', ')}`
        });
      }
    }

    return issues;
  }

  async generateImprovementSuggestions(
    config: ResearchConfig,
    reviewResult: QualityReviewResult
  ): Promise<string[]> {
    if (reviewResult.overallScore >= 0.9) {
      return ['Research meets high quality standards'];
    }

    const prompt = `Based on this quality review, suggest specific improvements:

Issues found:
${reviewResult.issues.map(i => `- ${i.severity}: ${i.description}`).join('\n')}

Current recommendations:
${reviewResult.recommendations.join('\n')}

Generate 3-5 specific, actionable suggestions to improve the research quality.`;

    await this.rateLimiter.waitIfNeeded();

    const completion = await this.anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }]
    });

    const suggestionsText = completion.content[0].type === 'text'
      ? completion.content[0].text
      : '';

    // Extract suggestions as array
    const suggestions = suggestionsText
      .split('\n')
      .filter(line => line.trim().match(/^[\d\-\*\•]/))
      .map(line => line.replace(/^[\d\-\*\•\.\)]\s*/, '').trim())
      .filter(s => s.length > 0);

    return suggestions.length > 0 ? suggestions : [
      'Expand research to cover all defined dimensions',
      'Add more concrete examples and evidence',
      'Verify findings across multiple sources',
      'Address identified gaps in analysis'
    ];
  }
}
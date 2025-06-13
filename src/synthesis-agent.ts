import Anthropic from '@anthropic-ai/sdk';
import { SubAgent, TaskSynthesis, TaskRecommendation } from './types.js';
import { RateLimiter } from './rate-limiter.js';

export class SynthesisAgent {
  private anthropic: Anthropic;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
    // Share rate limiter for Claude API
    this.rateLimiter = new RateLimiter(10, 60000);
  }

  async synthesizeFindings(
    subAgents: SubAgent[],
    dimensionsToCompare: string[],
    goal: string
  ): Promise<{ synthesis: TaskSynthesis; recommendation: TaskRecommendation }> {
    const completedAgents = subAgents.filter(a => a.status === 'completed' && a.results);
    
    const systemPrompt = `You are an expert analyst synthesizing research findings across multiple evaluation areas for LLM/agent tools.
Your goal is to ${goal}

You will analyze findings across these dimensions:
${dimensionsToCompare.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Provide a comprehensive synthesis that:
1. Compares each area across all dimensions
2. Identifies the strongest opportunities
3. Ranks areas by opportunity score
4. Recommends the best area for a solo developer to pursue`;

    const researchSummary = this.formatResearchForSynthesis(completedAgents);

    const userPrompt = `Synthesize the following research findings and provide recommendations:

${researchSummary}

Please provide:
1. A detailed comparison across all dimensions
2. Numerical scores for each area:
   - Pain-to-solution ratio (0-10, higher = more opportunity)
   - Feasibility score (0-10, higher = easier to build)
   - Overall opportunity score (0-10)
3. A clear recommendation with reasoning
4. Confidence level in your recommendation (0-1)`;

    try {
      // Wait if rate limited
      await this.rateLimiter.waitIfNeeded();

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.5,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const synthesisText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      return this.parseSynthesisResponse(synthesisText, completedAgents, dimensionsToCompare);
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate_limit')) {
        console.error('Rate limit error during synthesis. Retrying...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.synthesizeFindings(subAgents, dimensionsToCompare, goal);
      }
      console.error('Error synthesizing findings:', error);
      throw error;
    }
  }

  private formatResearchForSynthesis(agents: SubAgent[]): string {
    return agents.map(agent => {
      const results = agent.results!;
      return `
## ${agent.area}

### Tool Coverage
- Existing Solutions: ${results.toolCoverage.existingSolutions.join('; ')}
- Gaps: ${results.toolCoverage.gaps.join('; ')}

### Enterprise Demand (${results.enterpriseDemand.intensity})
${results.enterpriseDemand.signals.join('\n- ')}

### Funding/Developer Activity
- Recent Funding: ${results.fundingActivity.recentFunding.join('; ')}
- Developer Activity: ${results.fundingActivity.developerActivity.join('; ')}

### Pain Points (${results.painPoints.severity} severity)
${results.painPoints.sources.join('\n- ')}

### Revenue Potential
- Estimated: ${results.revenueAnalysis.potentialRevenue}
- Pricing Models: ${results.revenueAnalysis.viablePricingModels.join(', ')}
`;
    }).join('\n---\n');
  }

  private parseSynthesisResponse(
    synthesisText: string,
    agents: SubAgent[],
    dimensions: string[]
  ): { synthesis: TaskSynthesis; recommendation: TaskRecommendation } {
    // Extract rankings
    const rankings = this.extractRankings(synthesisText, agents);
    
    // Extract dimension comparisons
    const dimensionComparisons = this.extractDimensionComparisons(
      synthesisText, 
      agents, 
      dimensions
    );

    // Extract recommendation
    const recommendation = this.extractRecommendation(synthesisText, rankings);

    const synthesis: TaskSynthesis = {
      taskId: agents[0].parentTaskId,
      dimensionComparisons,
      rankings,
      recommendation,
    };

    return { synthesis, recommendation };
  }

  private extractRankings(text: string, agents: SubAgent[]): TaskSynthesis['rankings'] {
    const rankings: TaskSynthesis['rankings'] = [];

    agents.forEach(agent => {
      const areaSection = this.findAreaSection(text, agent.area);
      
      const painToSolution = this.extractScore(areaSection, 'pain-to-solution', 'opportunity') || 5;
      const feasibility = this.extractScore(areaSection, 'feasibility', 'ease') || 5;
      const overall = this.extractScore(areaSection, 'overall', 'total') || 5;

      rankings.push({
        area: agent.area,
        painToSolutionRatio: painToSolution,
        feasibilityScore: feasibility,
        overallScore: overall,
      });
    });

    // Sort by overall score
    return rankings.sort((a, b) => b.overallScore - a.overallScore);
  }

  private extractScore(text: string, ...keywords: string[]): number | null {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*(?:\/|out of)\s*10/i,
      /score[:\s]+(\d+(?:\.\d+)?)/i,
      /(\d+(?:\.\d+)?)\s*(?:points?)/i,
    ];

    for (const keyword of keywords) {
      const keywordIndex = text.toLowerCase().indexOf(keyword);
      if (keywordIndex === -1) continue;

      const nearbyText = text.slice(
        Math.max(0, keywordIndex - 50),
        keywordIndex + 100
      );

      for (const pattern of patterns) {
        const match = nearbyText.match(pattern);
        if (match) {
          return parseFloat(match[1]);
        }
      }
    }

    return null;
  }

  private findAreaSection(text: string, area: string): string {
    const lines = text.split('\n');
    const areaIndex = lines.findIndex(line => 
      line.toLowerCase().includes(area.toLowerCase())
    );

    if (areaIndex === -1) return '';

    // Extract the next 20 lines or until next area
    return lines.slice(areaIndex, areaIndex + 20).join('\n');
  }

  private extractDimensionComparisons(
    text: string,
    agents: SubAgent[],
    dimensions: string[]
  ): TaskSynthesis['dimensionComparisons'] {
    const comparisons: TaskSynthesis['dimensionComparisons'] = {};

    dimensions.forEach(dimension => {
      comparisons[dimension] = {};
      
      agents.forEach(agent => {
        // Find the section discussing this dimension for this area
        const dimensionKey = dimension.toLowerCase().replace(/[^a-z0-9]/g, '');
        const areaKey = agent.area.toLowerCase();
        
        // Look for patterns like "Area X: dimension analysis"
        const sectionText = this.extractDimensionSection(text, agent.area, dimension);
        
        comparisons[dimension][agent.area] = {
          summary: sectionText.slice(0, 200) + (sectionText.length > 200 ? '...' : ''),
          details: agent.results || {},
        };
      });
    });

    return comparisons;
  }

  private extractDimensionSection(text: string, area: string, dimension: string): string {
    const lines = text.split('\n');
    const relevantLines: string[] = [];
    
    let inRelevantSection = false;
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes(area.toLowerCase()) && 
          lowerLine.includes(dimension.toLowerCase())) {
        inRelevantSection = true;
      }
      
      if (inRelevantSection) {
        relevantLines.push(line);
        if (relevantLines.length > 5) break;
      }
    }

    return relevantLines.join(' ').trim();
  }

  private extractRecommendation(
    text: string,
    rankings: TaskSynthesis['rankings']
  ): TaskRecommendation {
    // Look for recommendation patterns
    const recommendPatterns = [
      /recommend(?:ed|ation)?[:\s]+([^\.]+)/i,
      /best\s+(?:area|option|choice)[:\s]+([^\.]+)/i,
      /should\s+(?:pursue|focus on)[:\s]+([^\.]+)/i,
    ];

    let recommendedArea = rankings[0]?.area || '';
    let reasoning = '';

    for (const pattern of recommendPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Check if the match contains one of our areas
        const matchedArea = rankings.find(r => 
          match[1].toLowerCase().includes(r.area.toLowerCase())
        );
        if (matchedArea) {
          recommendedArea = matchedArea.area;
        }
        break;
      }
    }

    // Extract reasoning
    const reasoningPatterns = [
      /reasoning[:\s]+([^\.]+(?:\.[^\.]+)?)/i,
      /because[:\s]+([^\.]+(?:\.[^\.]+)?)/i,
      /due to[:\s]+([^\.]+(?:\.[^\.]+)?)/i,
    ];

    for (const pattern of reasoningPatterns) {
      const match = text.match(pattern);
      if (match) {
        reasoning = match[1].trim();
        break;
      }
    }

    // Extract confidence
    const confidenceMatch = text.match(/confidence[:\s]+(\d+(?:\.\d+)?)/i);
    const confidence = confidenceMatch 
      ? parseFloat(confidenceMatch[1]) 
      : 0.75;

    return {
      recommendedArea,
      reasoning: reasoning || `${recommendedArea} shows the highest opportunity score with strong market demand and feasible implementation path.`,
      confidence: Math.min(1, Math.max(0, confidence)),
    };
  }
}
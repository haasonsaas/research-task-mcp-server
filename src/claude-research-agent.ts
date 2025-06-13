import Anthropic from '@anthropic-ai/sdk';
import { SubAgent, SubAgentResults } from './types.js';
import { RateLimiter } from './rate-limiter.js';

export class ClaudeResearchAgent {
  private anthropic: Anthropic;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
    // Claude API rate limits: 10 requests per minute for standard tier
    this.rateLimiter = new RateLimiter(10, 60000);
  }

  async performResearch(
    agent: SubAgent,
    depth: 'basic' | 'comprehensive',
    includeSources: boolean
  ): Promise<SubAgentResults> {
    const systemPrompt = `You are a research analyst specializing in evaluating market opportunities for developer tools and LLM evaluation solutions. 
Your task is to analyze the area "${agent.area}" and provide structured findings based on the following objectives:

${agent.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

Provide your analysis in a structured format that addresses each objective. Be specific, cite real examples where possible, and focus on actionable insights.
${includeSources ? 'Include relevant sources and links where applicable.' : ''}`;

    const userPrompt = `Conduct ${depth} research on "${agent.area}" for the LLM evaluation market. 

For each objective:
1. Provide concrete findings with specific examples
2. Include quantitative data where available
3. Identify key players, tools, or solutions
4. Assess market signals and trends
5. Evaluate feasibility for a solo developer/small team

Format your response as a detailed analysis covering:
- Existing tools and solutions (with names and descriptions)
- Market gaps and unmet needs
- Enterprise demand indicators
- Developer pain points and complaints
- Recent funding or acquisition activity
- Revenue potential and pricing models
- Overall opportunity assessment`;

    try {
      // Wait if rate limited
      await this.rateLimiter.waitIfNeeded();

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        temperature: 0.7,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const analysisText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      return this.parseResearchResponse(analysisText, includeSources);
    } catch (error) {
      if (error instanceof Error && error.message.includes('rate_limit')) {
        console.error(`Rate limit error for ${agent.area}. Retrying...`);
        // Wait longer and retry
        await new Promise(resolve => setTimeout(resolve, 10000));
        return this.performResearch(agent, depth, includeSources);
      }
      console.error(`Error researching ${agent.area}:`, error);
      throw error;
    }
  }

  private parseResearchResponse(
    analysisText: string,
    includeSources: boolean
  ): SubAgentResults {
    // Extract sections from the analysis
    const toolCoverage = this.extractSection(analysisText, 'tools', 'solutions');
    const demand = this.extractSection(analysisText, 'demand', 'enterprise');
    const funding = this.extractSection(analysisText, 'funding', 'activity');
    const painPoints = this.extractSection(analysisText, 'pain', 'complaints');
    const revenue = this.extractSection(analysisText, 'revenue', 'pricing');

    const results: SubAgentResults = {
      toolCoverage: {
        existingSolutions: this.extractListItems(toolCoverage, ['existing', 'current', 'available']),
        gaps: this.extractListItems(toolCoverage, ['gap', 'missing', 'unmet', 'need']),
      },
      enterpriseDemand: {
        signals: this.extractListItems(demand, ['signal', 'indicator', 'evidence']),
        intensity: this.assessIntensity(demand),
      },
      fundingActivity: {
        recentFunding: this.extractListItems(funding, ['funding', 'investment', 'raised']),
        developerActivity: this.extractListItems(funding, ['developer', 'github', 'open source']),
      },
      painPoints: {
        sources: this.extractListItems(painPoints, ['complaint', 'frustration', 'issue']),
        severity: this.assessSeverity(painPoints),
      },
      revenueAnalysis: {
        potentialRevenue: this.extractRevenuePotential(revenue),
        viablePricingModels: this.extractListItems(revenue, ['pricing', 'model', 'subscription']),
      },
    };

    if (includeSources) {
      results.sources = this.extractSources(analysisText);
    }

    return results;
  }

  private extractSection(text: string, ...keywords: string[]): string {
    const lines = text.split('\n');
    const relevantLines: string[] = [];
    let capturing = false;

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        capturing = true;
      }
      if (capturing) {
        relevantLines.push(line);
        if (line.trim() === '' && relevantLines.length > 3) {
          break;
        }
      }
    }

    return relevantLines.join('\n');
  }

  private extractListItems(text: string, keywords: string[]): string[] {
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (keywords.some(keyword => lowerLine.includes(keyword))) {
        // Extract bullet points or numbered items
        const cleaned = line.replace(/^[\s\-\*\d\.]+/, '').trim();
        if (cleaned.length > 10) {
          items.push(cleaned);
        }
      }
    }

    // Also extract items that follow common patterns
    const bulletMatches = text.match(/[\-\*]\s+([^\n]+)/g) || [];
    const numberedMatches = text.match(/\d+\.\s+([^\n]+)/g) || [];

    [...bulletMatches, ...numberedMatches].forEach(match => {
      const cleaned = match.replace(/^[\s\-\*\d\.]+/, '').trim();
      if (cleaned.length > 10 && !items.includes(cleaned)) {
        items.push(cleaned);
      }
    });

    return items.slice(0, 5); // Limit to top 5 items
  }

  private assessIntensity(text: string): 'low' | 'medium' | 'high' {
    const highIndicators = ['significant', 'strong', 'high', 'substantial', 'major'];
    const lowIndicators = ['limited', 'low', 'minimal', 'weak', 'little'];
    
    const lowerText = text.toLowerCase();
    const highCount = highIndicators.filter(ind => lowerText.includes(ind)).length;
    const lowCount = lowIndicators.filter(ind => lowerText.includes(ind)).length;

    if (highCount > lowCount) return 'high';
    if (lowCount > highCount) return 'low';
    return 'medium';
  }

  private assessSeverity(text: string): 'low' | 'medium' | 'high' {
    return this.assessIntensity(text); // Similar logic
  }

  private extractRevenuePotential(text: string): string {
    // Look for revenue figures
    const revenueMatch = text.match(/\$[\d,]+[kKmMbB]?\s*(?:-\s*\$[\d,]+[kKmMbB]?)?\s*(?:ARR|MRR|revenue)?/i);
    if (revenueMatch) {
      return revenueMatch[0];
    }

    // Look for market size
    const marketMatch = text.match(/market.*\$[\d,]+[kKmMbB]/i);
    if (marketMatch) {
      return marketMatch[0];
    }

    return '$50k-250k ARR (estimated)';
  }

  private extractSources(text: string): string[] {
    const sources: string[] = [];
    
    // Extract URLs
    const urlMatches = text.match(/https?:\/\/[^\s]+/g) || [];
    sources.push(...urlMatches);

    // Extract references to specific tools/companies
    const toolMatches = text.match(/(?:GitHub|GitLab|website):\s*([^\n]+)/gi) || [];
    sources.push(...toolMatches.map(m => m.trim()));

    return sources.slice(0, 10); // Limit to 10 sources
  }
}
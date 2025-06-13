import { ResearchTemplate, ResearchDimension, QualityCheckConfig } from './types.js';

export const researchTemplates: Record<string, ResearchTemplate> = {
  market_research: {
    id: 'market_research',
    name: 'Market Research',
    domain: 'market_research',
    description: 'Comprehensive market analysis for products, services, or technologies',
    defaultDimensions: [
      {
        id: 'market_size',
        name: 'Market Size & Growth',
        description: 'Current market size, growth rate, and future projections',
        evaluationCriteria: ['Total addressable market', 'Growth rate', 'Market maturity'],
        dataPoints: ['Market value', 'CAGR', 'Key drivers', 'Market segments'],
        weight: 0.2
      },
      {
        id: 'competitive_landscape',
        name: 'Competitive Landscape',
        description: 'Key players, market share, and competitive dynamics',
        evaluationCriteria: ['Number of competitors', 'Market concentration', 'Competitive intensity'],
        dataPoints: ['Major players', 'Market share', 'Competitive advantages', 'Entry barriers'],
        weight: 0.25
      },
      {
        id: 'customer_analysis',
        name: 'Customer Analysis',
        description: 'Target customers, needs, and buying behavior',
        evaluationCriteria: ['Customer segments', 'Pain points', 'Willingness to pay'],
        dataPoints: ['Demographics', 'Psychographics', 'Buying process', 'Decision criteria'],
        weight: 0.25
      },
      {
        id: 'market_trends',
        name: 'Market Trends & Opportunities',
        description: 'Emerging trends, opportunities, and threats',
        evaluationCriteria: ['Trend strength', 'Opportunity size', 'Risk factors'],
        dataPoints: ['Technology trends', 'Regulatory changes', 'Social shifts', 'Economic factors'],
        weight: 0.3
      }
    ],
    defaultAudience: ['investors', 'executives', 'product_managers'],
    defaultQualityChecks: [
      {
        type: 'completeness',
        criteria: ['All dimensions covered', 'Data recency', 'Geographic coverage'],
        threshold: 0.8
      },
      {
        type: 'accuracy',
        criteria: ['Source credibility', 'Data consistency', 'Methodology soundness'],
        threshold: 0.85
      }
    ],
    exampleQuestions: [
      'What is the target market for this product/service?',
      'What time period should the analysis cover?',
      'Which geographic regions are most important?',
      'Are there specific competitors you want to focus on?'
    ]
  },

  academic_research: {
    id: 'academic_research',
    name: 'Academic Literature Review',
    domain: 'academic_research',
    description: 'Systematic review of academic literature on a specific topic',
    defaultDimensions: [
      {
        id: 'theoretical_frameworks',
        name: 'Theoretical Frameworks',
        description: 'Key theories, models, and conceptual frameworks',
        evaluationCriteria: ['Framework relevance', 'Theoretical evolution', 'Framework adoption'],
        dataPoints: ['Core theories', 'Key authors', 'Framework applications', 'Theoretical gaps'],
        weight: 0.25
      },
      {
        id: 'methodology_review',
        name: 'Research Methodologies',
        description: 'Common research methods and approaches',
        evaluationCriteria: ['Method appropriateness', 'Rigor', 'Innovation'],
        dataPoints: ['Quantitative methods', 'Qualitative approaches', 'Mixed methods', 'Sampling strategies'],
        weight: 0.2
      },
      {
        id: 'key_findings',
        name: 'Key Research Findings',
        description: 'Major discoveries and empirical results',
        evaluationCriteria: ['Finding consistency', 'Evidence strength', 'Practical significance'],
        dataPoints: ['Consensus findings', 'Controversial results', 'Meta-analyses', 'Replications'],
        weight: 0.3
      },
      {
        id: 'research_gaps',
        name: 'Research Gaps & Future Directions',
        description: 'Identified gaps and opportunities for future research',
        evaluationCriteria: ['Gap significance', 'Feasibility', 'Impact potential'],
        dataPoints: ['Methodological gaps', 'Theoretical gaps', 'Empirical gaps', 'Proposed directions'],
        weight: 0.25
      }
    ],
    defaultAudience: ['researchers', 'academics', 'graduate_students'],
    defaultQualityChecks: [
      {
        type: 'completeness',
        criteria: ['Literature coverage', 'Time span adequacy', 'Source diversity'],
        threshold: 0.85
      },
      {
        type: 'bias',
        criteria: ['Publication bias', 'Geographic bias', 'Methodological bias'],
        threshold: 0.8
      }
    ],
    exampleQuestions: [
      'What specific aspect of the topic interests you most?',
      'What time period should the literature review cover?',
      'Are there specific journals or conferences to prioritize?',
      'Do you need a theoretical or empirical focus?'
    ]
  },

  competitive_analysis: {
    id: 'competitive_analysis',
    name: 'Competitive Analysis',
    domain: 'competitive_analysis',
    description: 'In-depth analysis of competitive landscape and positioning',
    defaultDimensions: [
      {
        id: 'competitor_profiles',
        name: 'Competitor Profiles',
        description: 'Detailed analysis of key competitors',
        evaluationCriteria: ['Market position', 'Financial strength', 'Strategic focus'],
        dataPoints: ['Company overview', 'Products/services', 'Market share', 'Key metrics'],
        weight: 0.2
      },
      {
        id: 'competitive_positioning',
        name: 'Competitive Positioning',
        description: 'Relative strengths, weaknesses, and market positioning',
        evaluationCriteria: ['Differentiation', 'Value proposition', 'Brand strength'],
        dataPoints: ['USPs', 'Pricing strategy', 'Target segments', 'Brand perception'],
        weight: 0.25
      },
      {
        id: 'strategic_analysis',
        name: 'Strategic Analysis',
        description: 'Competitive strategies and future moves',
        evaluationCriteria: ['Strategy clarity', 'Execution capability', 'Innovation potential'],
        dataPoints: ['Growth strategies', 'R&D focus', 'Partnership strategies', 'M&A activity'],
        weight: 0.3
      },
      {
        id: 'competitive_dynamics',
        name: 'Competitive Dynamics',
        description: 'Market dynamics and competitive responses',
        evaluationCriteria: ['Market stability', 'Competitive intensity', 'Disruption risk'],
        dataPoints: ['Competitive moves', 'Market reactions', 'Entry threats', 'Substitute threats'],
        weight: 0.25
      }
    ],
    defaultAudience: ['executives', 'strategy_teams', 'product_managers'],
    defaultQualityChecks: [
      {
        type: 'accuracy',
        criteria: ['Data currency', 'Source reliability', 'Fact verification'],
        threshold: 0.9
      },
      {
        type: 'depth',
        criteria: ['Analysis depth', 'Insight quality', 'Strategic relevance'],
        threshold: 0.85
      }
    ],
    exampleQuestions: [
      'Who are your main competitors?',
      'What aspects of competition are most important?',
      'What is your current market position?',
      'What strategic decisions does this need to inform?'
    ]
  },

  technology_assessment: {
    id: 'technology_assessment',
    name: 'Technology Assessment',
    domain: 'technology_assessment',
    description: 'Evaluation of technologies for adoption or investment',
    defaultDimensions: [
      {
        id: 'technical_capabilities',
        name: 'Technical Capabilities',
        description: 'Core features, performance, and technical specifications',
        evaluationCriteria: ['Feature completeness', 'Performance metrics', 'Scalability'],
        dataPoints: ['Key features', 'Performance benchmarks', 'Architecture', 'Limitations'],
        weight: 0.3
      },
      {
        id: 'market_readiness',
        name: 'Market Readiness',
        description: 'Maturity, adoption rate, and ecosystem support',
        evaluationCriteria: ['Technology maturity', 'Market adoption', 'Ecosystem strength'],
        dataPoints: ['TRL level', 'User base', 'Community support', 'Integration options'],
        weight: 0.25
      },
      {
        id: 'implementation_factors',
        name: 'Implementation Considerations',
        description: 'Cost, complexity, and resource requirements',
        evaluationCriteria: ['Implementation cost', 'Complexity', 'Resource needs'],
        dataPoints: ['TCO', 'Learning curve', 'Infrastructure needs', 'Support requirements'],
        weight: 0.25
      },
      {
        id: 'future_potential',
        name: 'Future Potential',
        description: 'Innovation trajectory and long-term viability',
        evaluationCriteria: ['Innovation rate', 'Vendor stability', 'Future roadmap'],
        dataPoints: ['R&D investment', 'Patent activity', 'Roadmap', 'Industry backing'],
        weight: 0.2
      }
    ],
    defaultAudience: ['ctos', 'technical_teams', 'innovation_managers'],
    defaultQualityChecks: [
      {
        type: 'accuracy',
        criteria: ['Technical accuracy', 'Benchmark validity', 'Source expertise'],
        threshold: 0.9
      },
      {
        type: 'consistency',
        criteria: ['Metric consistency', 'Comparison fairness', 'Evaluation objectivity'],
        threshold: 0.85
      }
    ],
    exampleQuestions: [
      'What is the primary use case for this technology?',
      'What are your technical requirements?',
      'What is your implementation timeline?',
      'Do you have specific vendors in mind?'
    ]
  }
};

export function getTemplate(domain: string): ResearchTemplate | undefined {
  return researchTemplates[domain];
}

export function suggestTemplate(description: string): string | undefined {
  const keywords = {
    market_research: ['market', 'customers', 'competition', 'opportunity', 'demand', 'growth'],
    academic_research: ['literature', 'research', 'theory', 'study', 'academic', 'papers'],
    competitive_analysis: ['competitors', 'competitive', 'rivalry', 'positioning', 'strategy'],
    technology_assessment: ['technology', 'technical', 'software', 'platform', 'tool', 'system']
  };

  const lowercaseDesc = description.toLowerCase();
  let bestMatch: { domain: string; score: number } | undefined;

  for (const [domain, domainKeywords] of Object.entries(keywords)) {
    const score = domainKeywords.filter(keyword => 
      lowercaseDesc.includes(keyword)
    ).length;
    
    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { domain, score };
    }
  }

  return bestMatch?.domain;
}
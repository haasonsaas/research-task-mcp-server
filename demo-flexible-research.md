# Demo: Flexible Research System

This demo shows how to use the new flexible research system that works for ANY topic.

## Example 1: Market Research for Sustainable Packaging

```javascript
// Step 1: Start configuration
await configureResearch({
  initialDescription: "I want to research sustainable packaging solutions for e-commerce"
})

// Response:
{
  "sessionId": "abc-123",
  "response": "I'll help you research sustainable packaging solutions for e-commerce. Let me ask a few questions:\n\n1. What's your primary goal with this research? Are you:\n   - Looking for investment opportunities\n   - Planning to develop a product\n   - Conducting competitive analysis\n   - Academic research\n\n2. What geographic markets are you most interested in?\n\n3. What aspects are most important to you?\n   - Cost effectiveness\n   - Environmental impact metrics\n   - Consumer adoption rates\n   - Regulatory compliance",
  "suggestedTemplate": "market_research"
}

// Step 2: Continue conversation
await continueConfiguration({
  sessionId: "abc-123",
  userResponse: "I'm looking at this from an investment perspective. Focusing on North American markets. Most interested in cost effectiveness and consumer adoption rates."
})

// Step 3: Generate plan
await generateResearchPlan({
  sessionId: "abc-123"
})

// Returns a customized research plan with dimensions like:
// - Market Size & Growth (packaging industry, sustainable segment)
// - Competitive Landscape (existing solutions, market leaders)
// - Customer Analysis (e-commerce adoption, willingness to pay)
// - Technology & Innovation (materials, recycling, biodegradability)

// Step 4: Execute research
await runFlexibleResearch({
  configId: "config-456",
  executionMode: "parallel",
  includeQualityReview: true
})
```

## Example 2: Academic Literature Review

```javascript
await configureResearch({
  initialDescription: "Literature review on machine learning applications in healthcare diagnostics"
})

// Wizard asks about:
// - Specific diagnostic areas (radiology, pathology, etc.)
// - Time period for literature
// - Theoretical vs empirical focus
// - Target journal quality
```

## Example 3: Competitive Analysis

```javascript
await configureResearch({
  initialDescription: "Analyze competitors in the meal kit delivery space"
})

// Wizard asks about:
// - Your current position/company
// - Specific competitors of interest
// - Geographic focus
// - Strategic priorities (pricing, features, market expansion)
```

## Example 4: Technology Assessment

```javascript
await configureResearch({
  initialDescription: "Evaluate different observability platforms for our SaaS startup"
})

// Wizard asks about:
// - Current tech stack
// - Scale and requirements
// - Budget constraints
// - Integration needs
```

## Key Features

1. **Adaptive Configuration**: The wizard adapts questions based on your topic
2. **Smart Templates**: Automatically suggests appropriate research framework
3. **Quality Assurance**: Built-in review agent checks completeness and bias
4. **Flexible Output**: Choose from comparison, recommendations, executive summary, etc.
5. **Parallel Research**: Multiple AI agents work simultaneously on different dimensions

## Benefits Over Legacy System

- **Not Limited to LLM Tools**: Research ANY topic
- **Interactive Setup**: No need to manually define all parameters
- **Intelligent Defaults**: System suggests appropriate dimensions and criteria
- **Quality Built-in**: Automatic quality review and improvement suggestions
- **Better Prompts**: Context-aware prompts for each domain
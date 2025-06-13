import { FlexibleResearchManager } from '../src/flexible-research-manager.js';
import * as dotenv from 'dotenv';

dotenv.config();

async function demonstrateResearch() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('Please set ANTHROPIC_API_KEY');
    return;
  }

  const manager = new FlexibleResearchManager(apiKey);

  console.log('🔍 Starting Research Configuration...\n');

  // Example 1: Market Research
  console.log('=== Example 1: Market Research ===');
  const marketSession = await manager.configureResearch({
    initialDescription: "I want to research the market for AI-powered personal finance apps"
  });

  console.log('Assistant:', marketSession.response);
  console.log('Suggested Template:', marketSession.suggestedTemplate);
  console.log('\n---\n');

  // Example 2: Academic Research
  console.log('=== Example 2: Academic Research ===');
  const academicSession = await manager.configureResearch({
    initialDescription: "Literature review on machine learning applications in healthcare diagnostics"
  });

  console.log('Assistant:', academicSession.response);
  console.log('Suggested Template:', academicSession.suggestedTemplate);
  console.log('\n---\n');

  // Example 3: Technology Assessment
  console.log('=== Example 3: Technology Assessment ===');
  const techSession = await manager.configureResearch({
    initialDescription: "Evaluate different cloud providers for our SaaS startup"
  });

  console.log('Assistant:', techSession.response);
  console.log('Suggested Template:', techSession.suggestedTemplate);
  console.log('\n---\n');

  // Example 4: Custom Research
  console.log('=== Example 4: Custom Research ===');
  const customSession = await manager.configureResearch({
    initialDescription: "Research the impact of remote work on company culture in tech startups"
  });

  console.log('Assistant:', customSession.response);
  console.log('Suggested Template:', customSession.suggestedTemplate || 'custom');

  console.log('\n✅ Demo completed! Use the session IDs to continue configuration.');
}

// Run the demo
demonstrateResearch().catch(console.error);
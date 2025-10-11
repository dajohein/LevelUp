/**
 * Test script for AI Learning Coach
 * Verifies core functionality and integration
 */

import { AILearningCoach } from './services/ai/learningCoach';
import { AdvancedPatternRecognizer } from './services/ai/advancedPatternRecognizer';
import { AdvancedMLModels } from './services/ai/advancedMLModels';
import { enhancedStorage } from './services/storage/enhancedStorage';
import { AnalyticsEventType } from './services/analytics/interfaces';

async function testAILearningCoach() {
  console.log('🤖 Testing AI Learning Coach Implementation...\n');

  try {
    // Initialize components
    console.log('1. Initializing AI components...');
    const patternRecognizer = new AdvancedPatternRecognizer(enhancedStorage);
    const mlModels = new AdvancedMLModels(enhancedStorage);
    const aiCoach = new AILearningCoach(enhancedStorage, patternRecognizer as any, mlModels as any);
    console.log('✅ AI components initialized successfully');

    // Create sample learning events
    console.log('\n2. Creating sample learning session events...');
    const sessionEvents = [
      {
        id: 'test_1',
        type: AnalyticsEventType.SESSION_START,
        timestamp: Date.now() - 60000,
        userId: 'test-user',
        sessionId: 'test-session',
        data: { languageCode: 'de' }
      },
      {
        id: 'test_2',
        type: AnalyticsEventType.WORD_ATTEMPT,
        timestamp: Date.now() - 50000,
        userId: 'test-user',
        sessionId: 'test-session',
        data: { 
          word: 'hallo',
          difficulty: 0.3,
          responseTime: 2000,
          accuracy: true
        }
      },
      {
        id: 'test_3',
        type: AnalyticsEventType.WORD_FAILURE,
        timestamp: Date.now() - 40000,
        userId: 'test-user',
        sessionId: 'test-session',
        data: { 
          word: 'schwierig',
          difficulty: 0.8,
          responseTime: 8000,
          accuracy: false
        }
      },
      {
        id: 'test_4',
        type: AnalyticsEventType.WORD_SUCCESS,
        timestamp: Date.now() - 30000,
        userId: 'test-user',
        sessionId: 'test-session',
        data: { 
          word: 'gut',
          difficulty: 0.4,
          responseTime: 1500,
          accuracy: true
        }
      }
    ];
    console.log('✅ Sample events created');

    // Test AI behavioral analysis
    console.log('\n3. Running AI behavioral analysis...');
    const insights = await aiCoach.analyzeLearningBehavior('test-user', 'de', sessionEvents);
    console.log(`✅ Analysis complete! Generated ${insights.length} insights`);

    // Display insights
    console.log('\n4. AI Learning Insights:');
    insights.forEach((insight, index) => {
      console.log(`\n   Insight ${index + 1}:`);
      console.log(`   📊 Type: ${insight.type}`);
      console.log(`   🚨 Severity: ${insight.severity}`);
      console.log(`   💬 Message: ${insight.message}`);
      console.log(`   🎯 Urgency: ${insight.urgency}`);
      console.log(`   📈 Confidence: ${(insight.confidence * 100).toFixed(0)}%`);
      console.log(`   🔧 Recommendations: ${insight.recommendations.length}`);
      
      if (insight.recommendations.length > 0) {
        const rec = insight.recommendations[0];
        console.log(`      → ${rec.type}: ${rec.action}`);
        console.log(`      → Reasoning: ${rec.reasoning[0]}`);
        console.log(`      → Expected improvement: ${(rec.expectedImprovement * 100).toFixed(0)}%`);
      }
    });

    // Test pattern recognition
    console.log('\n5. Testing advanced pattern recognition...');
    const patterns = await patternRecognizer.detectAdvancedPatterns(sessionEvents, 'test-user');
    console.log(`✅ Pattern analysis complete! Detected ${patterns.length} patterns`);

    if (patterns.length > 0) {
      console.log('\n   Detected Patterns:');
      patterns.forEach((pattern, index) => {
        console.log(`   Pattern ${index + 1}: ${pattern.type} (Confidence: ${(pattern.confidence * 100).toFixed(0)}%)`);
      });
    }

    // Test ML predictions
    console.log('\n6. Testing ML predictions...');
    const churnRisk = await mlModels.predictChurnRisk('test-user', sessionEvents, {
      userId: 'test-user',
      sessionTime: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    });
    console.log(`✅ Churn risk prediction: ${(churnRisk.risk * 100).toFixed(0)}% (Confidence: ${(churnRisk.confidence * 100).toFixed(0)}%)`);

    console.log('\n🎉 AI Learning Coach test completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Generated ${insights.length} behavioral insights`);
    console.log(`   - Detected ${patterns.length} learning patterns`);
    console.log(`   - Churn risk assessment: ${(churnRisk.risk * 100).toFixed(0)}%`);
    console.log(`   - System operational and ready for integration`);

  } catch (error) {
    console.error('❌ AI Learning Coach test failed:', error);
    throw error;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAILearningCoach()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testAILearningCoach };
/**
 * Challenge Data Storage Integration Example
 *
 * Demonstrates how to use the enhanced UserLearningProfile storage
 * to track AI challenge performance data across sessions.
 */

import { userLearningProfileStorage } from '../services/storage/userLearningProfile';
import { streakChallengeService } from '../services/streakChallengeService';
import { bossBattleService } from '../services/bossBattleService';
import { challengeAIIntegrator } from '../services/challengeAIIntegrator';

/**
 * Example: Complete streak challenge session with AI integration
 */
export async function exampleStreakChallengeSession() {
  const userId = 'demo-user-123';

  // Simulate a streak challenge session
  console.log('🎯 Starting AI-enhanced streak challenge...');

  // Simulate session results (normally these would come from actual quiz completion)
  const sessionResults = {
    streak: 9, // User succeeded and advanced streak
    wordsCompleted: 5, // Completed 5 words in this session
    accuracy: 0.85, // 85% accuracy
    wasAIEnhanced: true, // AI was used to enhance this session
    tier: 2, // Tier 2 (streak 5-8 range)
    quizMode: 'letter-scramble' as const,
    cognitiveLoad: 'moderate' as const,
    adaptationsUsed: ['quiz-mode-adjustment'],
  };

  console.log(`📚 Simulated streak challenge session completed`);
  console.log(`🎲 Quiz mode: ${sessionResults.quizMode}`);
  console.log(`🧠 AI enhanced: ${sessionResults.wasAIEnhanced}`);
  console.log(`🎯 New streak: ${sessionResults.streak}`);

  try {
    // Save performance data to user profile
    await streakChallengeService.saveStreakPerformance(userId, sessionResults);

    console.log('✅ Streak challenge performance saved to user profile');

    // Update challenge insights
    await userLearningProfileStorage.updateChallengeInsights(userId);
    console.log('📊 Challenge insights updated');

    return sessionResults;
  } catch (error) {
    console.error('❌ Streak challenge session failed:', error);
    throw error;
  }
}

/**
 * Example: Complete boss battle session with phase tracking
 */
export async function exampleBossBattleSession() {
  const userId = 'demo-user-123';

  console.log('⚔️ Starting AI-enhanced boss battle...');

  // Simulate boss battle session results
  const sessionResults = {
    wordsCompleted: 18, // Made it pretty far
    completed: false, // Didn't finish all 25
    wasAIEnhanced: true, // AI was used to enhance this session
    finalBossReached: false, // Didn't reach final phase
    finalBossDefeated: false,
    phasePerformance: {
      'early-boss': { accuracy: 0.9, avgTime: 3.2, adaptations: 0 },
      'mid-boss': { accuracy: 0.8, avgTime: 4.1, adaptations: 1 },
      'late-boss': { accuracy: 0.7, avgTime: 5.0, adaptations: 2 },
    },
    quizMode: 'open-answer' as const,
    cognitiveLoad: 'high' as const,
  };

  console.log(`🏰 Simulated boss battle with ${sessionResults.wordsCompleted} words completed`);
  console.log(`🎲 Quiz mode: ${sessionResults.quizMode}`);
  console.log(`🧠 AI enhanced: ${sessionResults.wasAIEnhanced}`);
  console.log(
    `💪 Performance: ${((sessionResults.wordsCompleted / 25) * 100).toFixed(1)}% complete`
  );

  try {
    // Save performance data to user profile
    await bossBattleService.saveBossPerformance(userId, sessionResults);

    console.log('✅ Boss battle performance saved to user profile');

    // Update challenge insights
    await userLearningProfileStorage.updateChallengeInsights(userId);
    console.log('📊 Challenge insights updated');

    return sessionResults;
  } catch (error) {
    console.error('❌ Boss battle session failed:', error);
    throw error;
  }
}

/**
 * Example: AI intervention tracking
 */
export async function exampleAIInterventionTracking() {
  const userId = 'demo-user-123';

  console.log('🤖 Tracking AI intervention effectiveness...');

  // Simulate an AI intervention during a challenge
  const interventionData = {
    type: 'cognitive-load-support' as const,
    successful: true, // Intervention helped user performance
    beforeAccuracy: 0.65, // User was struggling
    afterAccuracy: 0.82, // AI helped improve performance
    beforeTime: 6.5, // Taking too long per word
    afterTime: 4.2, // AI adjustment helped speed up
    wasAISession: true,
  };

  try {
    await challengeAIIntegrator.saveAIPerformanceData(userId, interventionData);

    console.log('✅ AI intervention performance tracked');
    console.log(
      `📈 Accuracy improvement: ${interventionData.afterAccuracy - interventionData.beforeAccuracy}`
    );
    console.log(
      `⚡ Time improvement: ${interventionData.beforeTime - interventionData.afterTime}s`
    );

    return interventionData;
  } catch (error) {
    console.error('❌ AI intervention tracking failed:', error);
    throw error;
  }
}

/**
 * Example: Get comprehensive challenge analytics
 */
export async function exampleGetChallengeAnalytics() {
  const userId = 'demo-user-123';

  console.log('📈 Retrieving challenge performance analytics...');

  try {
    const analytics = await userLearningProfileStorage.getChallengeAnalytics(userId);

    console.log('\n📊 CHALLENGE ANALYTICS SUMMARY:');

    // Streak Performance
    if (analytics.streakPerformance) {
      console.log('\n🎯 Streak Challenges:');
      console.log(`  • Total sessions: ${analytics.streakPerformance.totalSessions}`);
      console.log(`  • Best streak: ${analytics.streakPerformance.bestStreak}`);
      console.log(`  • Average streak: ${analytics.streakPerformance.averageStreak?.toFixed(1)}`);
      console.log(
        `  • AI improvement rate: ${analytics.streakPerformance.aiImprovementRate?.toFixed(1)}%`
      );
    }

    // Boss Performance
    if (analytics.bossPerformance) {
      console.log('\n⚔️ Boss Battles:');
      console.log(`  • Completion rate: ${analytics.bossPerformance.completionRate?.toFixed(1)}%`);
      console.log(
        `  • Average words completed: ${analytics.bossPerformance.averageWordsCompleted?.toFixed(1)}`
      );
      console.log(
        `  • Final boss success rate: ${analytics.bossPerformance.finalBossSuccessRate?.toFixed(1)}%`
      );
    }

    // AI Effectiveness
    if (analytics.aiEffectiveness) {
      console.log('\n🤖 AI Effectiveness:');
      console.log(
        `  • Intervention success rate: ${analytics.aiEffectiveness.interventionSuccessRate?.toFixed(1)}%`
      );
      console.log(
        `  • Accuracy improvement: ${analytics.aiEffectiveness.accuracyImprovement?.toFixed(3)}`
      );
      console.log(
        `  • Learning velocity gain: ${analytics.aiEffectiveness.learningVelocityGain?.toFixed(3)}`
      );
    }

    // Insights
    if (analytics.insights) {
      console.log('\n💡 Learning Insights:');
      console.log(`  • Optimal challenge level: ${analytics.insights.optimalChallengeLevel}`);
      console.log(
        `  • Cognitive load tolerance: ${analytics.insights.cognitiveLoadTolerance?.toFixed(2)}`
      );
      console.log(
        `  • Adaptation preferences: ${analytics.insights.adaptationPreferences?.join(', ')}`
      );
      console.log(
        `  • Struggling indicators: ${analytics.insights.strugglingIndicators?.join(', ')}`
      );
    }

    return analytics;
  } catch (error) {
    console.error('❌ Failed to get challenge analytics:', error);
    throw error;
  }
}

/**
 * Run complete demonstration
 */
export async function runChallengeDataStorageDemo() {
  console.log('🚀 Starting Challenge Data Storage Integration Demo\n');

  try {
    // 1. Create initial user profile (will only create if doesn't exist)
    const userId = 'demo-user-123';
    await userLearningProfileStorage.createInitialProfile(userId);
    console.log('👤 Demo user profile created\n');

    // 2. Run streak challenge session
    await exampleStreakChallengeSession();
    console.log('');

    // 3. Run boss battle session
    await exampleBossBattleSession();
    console.log('');

    // 4. Track AI intervention
    await exampleAIInterventionTracking();
    console.log('');

    // 5. Get analytics
    await exampleGetChallengeAnalytics();

    console.log('\n✨ Challenge Data Storage Integration Demo Complete!');
  } catch (error) {
    console.error('\n💥 Demo failed:', error);
  }
}

// Export for use in development/testing
export default {
  runDemo: runChallengeDataStorageDemo,
  exampleStreakChallengeSession,
  exampleBossBattleSession,
  exampleAIInterventionTracking,
  exampleGetChallengeAnalytics,
};

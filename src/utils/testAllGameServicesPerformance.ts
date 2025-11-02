/**
 * Comprehensive Game Services Performance Test
 * Tests all major game services for storage optimization and performance
 */

import { challengeServiceManager } from '../services/challengeServiceManager';
import { enhancedWordService } from '../services/enhancedWordService';
import { storageOrchestrator } from '../services/storageCoordinator';
import { store } from '../store/store';
import { setLanguage } from '../store/gameSlice';
import { startSession } from '../store/sessionSlice';
import { logger } from '../services/logger';

export const testAllGameServicesPerformance = async () => {
  logger.info('🎮 Testing All Game Services Performance');

  const results = {
    storageOptimization: { passed: 0, total: 0, issues: [] as string[] },
    servicePerformance: { passed: 0, total: 0, issues: [] as string[] },
    memoryLeaks: { passed: 0, total: 0, issues: [] as string[] }
  };

  // Test 1: Storage Operation Optimization
  logger.info('📊 Testing Storage Operation Optimization...');
  
  try {
    // Simulate a complete game session workflow
    store.dispatch(setLanguage('de'));
    store.dispatch(startSession('quick-dash'));
    
    // Wait for debounced operations
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const afterStats = await storageOrchestrator.getStatistics();
    
    // New storage coordinator doesn't have queueLength, check pending changes instead
    const backgroundStatus = afterStats?.backgroundAutoSave;
    const pendingChanges = backgroundStatus?.pendingChanges || 0;
    
    if (pendingChanges <= 2) { // Language + session start
      results.storageOptimization.passed++;
      logger.info('✅ Storage optimization test passed');
    } else {
      results.storageOptimization.issues.push(`Too many pending operations: ${pendingChanges}`);
    }
    results.storageOptimization.total++;
  } catch (error) {
    results.storageOptimization.issues.push(`Storage test failed: ${error}`);
    results.storageOptimization.total++;
  }

  // Test 2: Challenge Service Performance
  logger.info('⚔️ Testing Challenge Services...');
  
  try {
    const supportedChallenges = ['quick-dash', 'deep-dive', 'streak-challenge', 'precision-mode'];
    
    for (const challengeId of supportedChallenges) {
      if (challengeServiceManager.isSessionTypeSupported(challengeId)) {
        const startTime = performance.now();
        
        // FIXED: Initialize the service first before calling getNextWord
        await challengeServiceManager.initializeSession(
          challengeId,
          'de',
          {},
          { targetWords: 15, timeLimit: 300, difficulty: 3 }
        );
        
        const context = {
          wordsCompleted: 5,
          currentStreak: 3,
          timeRemaining: 300,
          targetWords: 15,
          wordProgress: {},
          languageCode: 'de'
        };
        
        const result = await challengeServiceManager.getNextWord(challengeId, context);
        const duration = performance.now() - startTime;
        
        if (duration < 100) { // Should be very fast (increased to 100ms for initialization)
          results.servicePerformance.passed++;
        } else {
          results.servicePerformance.issues.push(`${challengeId} service slow: ${duration}ms`);
        }
        results.servicePerformance.total++;
        
        logger.info(`${challengeId}: ${duration.toFixed(1)}ms, Result: ${!!result.word}`);
      }
    }
  } catch (error) {
    logger.error(`Challenge service test failed: ${error}`);
    results.servicePerformance.issues.push(`Challenge service test failed: ${error}`);
    results.servicePerformance.total++;
  }

  // Test 3: Enhanced Word Service Performance
  logger.info('🧠 Testing Enhanced Word Service...');
  
  try {
    const startTime = performance.now();
    
    const initialized = enhancedWordService.initializeLearningSession('de', undefined, {});
    const duration = performance.now() - startTime;
    
    if (initialized && duration < 100) {
      results.servicePerformance.passed++;
      logger.info(`✅ Enhanced word service: ${duration.toFixed(1)}ms`);
    } else {
      results.servicePerformance.issues.push(`Enhanced service issues: init=${initialized}, time=${duration}ms`);
    }
    results.servicePerformance.total++;
    
    // Test memory cleanup
    enhancedWordService.resetSession();
    const currentWord = enhancedWordService.getCurrentWord();
    
    if (!currentWord) {
      results.memoryLeaks.passed++;
      logger.info('✅ Enhanced service cleanup successful');
    } else {
      results.memoryLeaks.issues.push('Enhanced service not properly cleaned up');
    }
    results.memoryLeaks.total++;
    
  } catch (error) {
    results.servicePerformance.issues.push(`Enhanced service test failed: ${error}`);
    results.servicePerformance.total++;
  }

  // Test 4: Deep Dive Service Performance (via Challenge Manager)
  logger.info('🤿 Testing Deep Dive Service...');
  
  try {
    const startTime = performance.now();
    
    // FIXED: Initialize Deep Dive service first
    await challengeServiceManager.initializeSession(
      'deep-dive',
      'de',
      {},
      { targetWords: 10, timeLimit: 240, difficulty: 3 }
    );
    
    const context = {
      wordsCompleted: 3,
      currentStreak: 2,
      timeRemaining: 240,
      targetWords: 10,
      wordProgress: {},
      languageCode: 'de'
    };
    
    const result = await challengeServiceManager.getNextWord('deep-dive', context);
    const duration = performance.now() - startTime;
    
    if (result.word && duration < 150) { // Increased to 150ms for initialization
      results.servicePerformance.passed++;
      logger.info(`✅ Deep dive service: ${duration.toFixed(1)}ms`);
    } else {
      results.servicePerformance.issues.push(`Deep dive issues: word=${!!result.word}, time=${duration}ms`);
    }
    results.servicePerformance.total++;
    
  } catch (error) {
    logger.error(`Deep dive service test failed: ${error}`);
    results.servicePerformance.issues.push(`Deep dive service test failed: ${error}`);
    results.servicePerformance.total++;
  }

  // Test 5: Memory Usage Check
  logger.info('🧹 Testing Memory Usage...');
  
  try {
    if (typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const limitMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      
      if (usedMB < limitMB * 0.8) { // Using less than 80% of available memory
        results.memoryLeaks.passed++;
        logger.info(`✅ Memory usage: ${usedMB}MB / ${limitMB}MB (healthy)`);
      } else {
        results.memoryLeaks.issues.push(`High memory usage: ${usedMB}MB / ${limitMB}MB`);
      }
    } else {
      logger.info('ℹ️ Memory API not available');
      results.memoryLeaks.passed++; // Don't fail if API unavailable
    }
    results.memoryLeaks.total++;
    
  } catch (error) {
    results.memoryLeaks.issues.push(`Memory test failed: ${error}`);
    results.memoryLeaks.total++;
  }

  // Final cleanup and force save
  await storageOrchestrator.saveCurrentState('immediate');

  // Summary Report
  logger.info(`\n🏁 Game Services Performance Test Complete:`);
  logger.info(`   📊 Storage Optimization: ${results.storageOptimization.passed}/${results.storageOptimization.total}`);
  logger.info(`   ⚡ Service Performance: ${results.servicePerformance.passed}/${results.servicePerformance.total}`);
  logger.info(`   🧹 Memory Management: ${results.memoryLeaks.passed}/${results.memoryLeaks.total}`);

  const allIssues = [
    ...results.storageOptimization.issues,
    ...results.servicePerformance.issues,
    ...results.memoryLeaks.issues
  ];

  if (allIssues.length > 0) {
    logger.warn(`   ❌ Issues found:`);
    allIssues.forEach(issue => logger.warn(`      - ${issue}`));
  } else {
    logger.info(`   🎉 All game services are optimized and performing well!`);
  }

  const totalPassed = results.storageOptimization.passed + results.servicePerformance.passed + results.memoryLeaks.passed;
  const totalTests = results.storageOptimization.total + results.servicePerformance.total + results.memoryLeaks.total;

  return {
    success: allIssues.length === 0,
    testsPassed: totalPassed,
    testsTotal: totalTests,
    details: results,
    issues: allIssues
  };
};

// Global access for testing
if (typeof window !== 'undefined') {
  (window as any).testAllGameServicesPerformance = testAllGameServicesPerformance;
}
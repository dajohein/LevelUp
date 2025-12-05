/**
 * Test suite to validate the word repetition fix
 * Tests that recently used words are properly excluded from selection
 */

import { selectWordForRegularSession } from '../services/wordSelectionManager';
import { getWordsForLanguage } from '../services/wordService';

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test that recently used words are excluded from regular word selection
 */
function testRecentlyUsedWordsExclusion(): TestResult {
  const languageCode = 'es'; // Spanish
  const words = getWordsForLanguage(languageCode);

  if (words.length < 10) {
    return {
      success: false,
      message: 'Not enough words to test repetition prevention',
      details: { wordCount: words.length },
    };
  }

  const wordProgress = {};
  const selectedWords: string[] = [];
  const maxIterations = 15;
  const sessionId = 'test-repetition-session';

  // Simulate selecting words and tracking recently used
  for (let i = 0; i < maxIterations; i++) {
    const result = selectWordForRegularSession(languageCode, wordProgress, sessionId);

    if (!result || !result.word) {
      return {
        success: false,
        message: `No word returned on iteration ${i}`,
        details: { iteration: i, selectedWords },
      };
    }

    const wordId = result.word.id;
    selectedWords.push(wordId);

    // The centralized system automatically prevents recently used words
    // We just need to track selections to verify no immediate repetitions occur
  }

  // Check for immediate repetition (same word appearing consecutively)
  for (let i = 1; i < selectedWords.length; i++) {
    if (selectedWords[i] === selectedWords[i - 1]) {
      return {
        success: false,
        message: `Immediate repetition detected: word ${selectedWords[i]} appeared consecutively`,
        details: { sequence: selectedWords, position: i },
      };
    }
  }

  // Check for excessive repetition (same word appearing too frequently in recent selections)
  const recentWindow = 8; // Check last 8 selections
  for (let i = recentWindow; i < selectedWords.length; i++) {
    const recentSelections = selectedWords.slice(i - recentWindow, i);
    if (recentSelections.includes(selectedWords[i])) {
      return {
        success: false,
        message: `Word ${selectedWords[i]} appeared again within ${recentWindow} recent selections`,
        details: {
          sequence: selectedWords,
          position: i,
          recentWindow: recentSelections,
        },
      };
    }
  }

  // Check for short-term repetition (same word within 5 positions)
  for (let i = 5; i < selectedWords.length; i++) {
    const recentWords = selectedWords.slice(i - 5, i);
    if (recentWords.includes(selectedWords[i])) {
      return {
        success: false,
        message: `Short-term repetition detected: word ${selectedWords[i]} appeared within last 5 words`,
        details: { sequence: selectedWords, position: i, recent: recentWords },
      };
    }
  }

  return {
    success: true,
    message: 'Word repetition prevention working correctly',
    details: {
      totalSelections: selectedWords.length,
      uniqueWords: new Set(selectedWords).size,
      sequence: selectedWords,
    },
  };
}

/**
 * Test module-specific word selection with repetition prevention
 */
function testModuleWordRepetitionPrevention(): TestResult {
  const languageCode = 'es';
  const moduleId = 'vocabulario-basico'; // Use a module that was showing repetition in logs

  const wordProgress = {};
  const selectedWords: string[] = [];
  const maxIterations = 10;
  const sessionId = `test-module-session-${moduleId}`;

  for (let i = 0; i < maxIterations; i++) {
    const result = selectWordForRegularSession(languageCode, wordProgress, sessionId, moduleId);

    if (!result || !result.word) {
      return {
        success: false,
        message: `No word returned from module ${moduleId} on iteration ${i}`,
        details: { iteration: i, module: moduleId },
      };
    }

    const wordId = result.word.id;
    selectedWords.push(wordId);

    // The centralized system automatically prevents recently used words
  }

  // Check for immediate repetition in module selections
  for (let i = 1; i < selectedWords.length; i++) {
    if (selectedWords[i] === selectedWords[i - 1]) {
      return {
        success: false,
        message: `Module immediate repetition detected: word ${selectedWords[i]} appeared consecutively`,
        details: {
          module: moduleId,
          sequence: selectedWords,
          position: i,
        },
      };
    }
  }

  return {
    success: true,
    message: 'Module word repetition prevention working correctly',
    details: {
      module: moduleId,
      totalSelections: selectedWords.length,
      uniqueWords: new Set(selectedWords).size,
      sequence: selectedWords,
    },
  };
}

/**
 * Test edge case: what happens when we have fewer words than the exclusion limit
 */
function testSmallWordPoolHandling(): TestResult {
  const languageCode = 'es';
  const wordProgress = {};

  // Simulate a scenario where we exclude most available words
  const words = getWordsForLanguage(languageCode);
  const wordIds = words.map((w: any) => w.id);
  const sessionId = 'test-edge-case-session';

  // Simulate using most words by making multiple selections
  // This will populate the internal recently used tracking
  const selectedWords: string[] = [];
  const maxSelectionsToMake = Math.max(0, wordIds.length - 3);

  for (let i = 0; i < maxSelectionsToMake; i++) {
    const result = selectWordForRegularSession(languageCode, wordProgress, sessionId);
    if (result && result.word) {
      selectedWords.push(result.word.id);
    }
  }

  // Now try to get one more word
  const finalResult = selectWordForRegularSession(languageCode, wordProgress, sessionId);

  if (!finalResult || !finalResult.word) {
    return {
      success: false,
      message: 'No word returned when most words were selected in session',
      details: {
        totalWords: words.length,
        selectedCount: selectedWords.length,
        availableWords: wordIds.length - selectedWords.length,
      },
    };
  }

  // Check that we're still getting valid words even with heavy usage
  return {
    success: true,
    message: 'Word selection handled heavy usage correctly',
    details: {
      totalWords: words.length,
      selectedInSession: selectedWords.length,
      finalWord: finalResult.word.term,
      allSelected: [...selectedWords, finalResult.word.id],
    },
  };
}

/**
 * Run all word repetition tests
 */
export function runWordRepetitionTests(): {
  overall: boolean;
  results: { [testName: string]: TestResult };
  summary: string;
} {
  console.log('🧪 Running word repetition fix tests...');

  const tests = {
    'Recently Used Words Exclusion': testRecentlyUsedWordsExclusion,
    'Module Word Repetition Prevention': testModuleWordRepetitionPrevention,
    'Small Word Pool Handling': testSmallWordPoolHandling,
  };

  const results: { [testName: string]: TestResult } = {};
  let passCount = 0;
  let totalCount = 0;

  for (const [testName, testFn] of Object.entries(tests)) {
    try {
      console.log(`  🔍 Running: ${testName}`);
      const result = testFn();
      results[testName] = result;

      if (result.success) {
        console.log(`  ✅ ${testName}: ${result.message}`);
        passCount++;
      } else {
        console.error(`  ❌ ${testName}: ${result.message}`, result.details);
      }

      totalCount++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : String(error);

      console.error(`  💥 ${testName}: Test failed with exception`, error);
      results[testName] = {
        success: false,
        message: `Test threw exception: ${errorMessage}`,
        details: { error: errorStack },
      };
      totalCount++;
    }
  }

  const overall = passCount === totalCount;
  const summary = `${passCount}/${totalCount} tests passed`;

  console.log(`\n📊 Word Repetition Tests Summary: ${summary}`);
  if (overall) {
    console.log('🎉 All tests passed! Word repetition issue should be fixed.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

  return { overall, results, summary };
}

// Make it available globally for testing in browser console
if (typeof window !== 'undefined') {
  (window as any).testWordRepetition = runWordRepetitionTests;
}

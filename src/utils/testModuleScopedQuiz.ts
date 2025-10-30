/**
 * Test script to verify module-scoped quiz generation
 * 
 * This script tests that multiple choice options are now properly scoped
 * to the same module as the quiz question, preventing cross-module contamination.
 */

import { challengeServiceManager } from '../services/challengeServiceManager';
import { getWordsForModule } from '../services/moduleService';

export const testModuleScopedQuizGeneration = async () => {
  console.log('🧪 Testing Module-Scoped Quiz Generation...\n');

  const testCases = [
    { language: 'de', moduleId: 'grundwortschatz', sessionType: 'deep-dive' },
    { language: 'de', moduleId: 'grammatik-grundlagen', sessionType: 'quick-dash' },
    { language: 'es', moduleId: 'vocabulario-basico', sessionType: 'streak-challenge' },
    { language: 'es', moduleId: 'frases-clave', sessionType: 'precision-mode' }
  ];

  for (const testCase of testCases) {
    console.log(`\n📚 Testing ${testCase.language}/${testCase.moduleId} with ${testCase.sessionType}...`);
    
    try {
      // Get module words to verify scoping
      const moduleWords = getWordsForModule(testCase.language, testCase.moduleId);
      const moduleWordIds = new Set(moduleWords.map(w => w.id));
      
      console.log(`   ✅ Module has ${moduleWords.length} words`);
      
      // Initialize session with module-specific words
      await challengeServiceManager.initializeSession(
        testCase.sessionType,
        testCase.language,
        {}, // Empty progress for testing
        { targetWords: 5 },
        testCase.moduleId // This is key - module-specific session
      );
      
      // Get a few quiz questions and verify options are module-scoped
      for (let i = 0; i < 3; i++) {
        const result = await challengeServiceManager.getNextWord(testCase.sessionType, {
          wordsCompleted: i,
          currentStreak: 0,
          targetWords: 5,
          languageCode: testCase.language,
          moduleId: testCase.moduleId,
          wordProgress: {}
        });
        
        if (result.word && result.options.length > 0) {
          // Check if the question word is from the module
          const questionWordFromModule = moduleWordIds.has(result.word.id);
          
          // For multiple choice, check if all options come from reasonable sources
          let optionsValid = true;
          let optionAnalysis = '';
          
          if (result.quizMode === 'multiple-choice' && result.word) {
            // Count how many options could come from the same module
            const moduleAnswers = moduleWords.map(w => 
              result.word!.direction === 'definition-to-term' ? w.term : w.definition
            );
            
            const optionsFromModule = result.options.filter(opt => moduleAnswers.includes(opt));
            
            optionAnalysis = `${optionsFromModule.length}/${result.options.length} options from module`;
            
            // We expect at least the correct answer + some module options
            optionsValid = optionsFromModule.length >= 2; 
          }
          
          console.log(`   ${questionWordFromModule ? '✅' : '❌'} Question "${result.word.term}" (${result.quizMode})`);
          if (result.quizMode === 'multiple-choice') {
            console.log(`      ${optionsValid ? '✅' : '❌'} Options: ${optionAnalysis}`);
            console.log(`      Options: [${result.options.join(', ')}]`);
          }
        }
      }
      
      // Reset the session
      challengeServiceManager.resetSession(testCase.sessionType);
      
    } catch (error) {
      console.log(`   ❌ Error testing ${testCase.sessionType}: ${(error as Error).message}`);
    }
  }
  
  console.log('\n🧪 Module-scoped quiz generation test completed!');
};

// Export for use in developer tools
export const runQuizScopeTest = testModuleScopedQuizGeneration;
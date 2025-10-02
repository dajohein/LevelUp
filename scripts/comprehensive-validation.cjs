#!/usr/bin/env node

// Comprehensive language configuration validation
const fs = require('fs');
const path = require('path');

console.log('🔍 Comprehensive Language Configuration Validation...\n');

const dataDir = path.join(__dirname, '../src/data');
const configDir = path.join(__dirname, '../src/config');

let allValid = true;
const validationResults = [];

// Test configurations for both existing languages
const testConfigurations = [
  {
    code: 'de',
    expectedName: 'German',
    expectedFlag: '🇩🇪',
    expectedCaseSensitive: true,
    expectedCapitalizationRequired: true,
    expectedModules: ['grundwortschatz'],
    sampleWords: ['die Gitarre', 'das Klavier', 'die Stadt']
  },
  {
    code: 'es', 
    expectedName: 'Spanish',
    expectedFlag: '🇪🇸',
    expectedCaseSensitive: false,
    expectedCapitalizationRequired: false,
    expectedModules: ['vocabulario-basico'],
    sampleWords: ['las vacaciones', 'el verano', 'la playa']
  }
];

console.log('🧪 Testing Language Configurations:\n');

for (const testConfig of testConfigurations) {
  console.log(`📋 Testing ${testConfig.code.toUpperCase()} (${testConfig.expectedName})`);
  
  let langResult = {
    code: testConfig.code,
    isValid: true,
    issues: [],
    tests: []
  };
  
  // 1. Test language metadata
  const indexPath = path.join(dataDir, testConfig.code, 'index.json');
  if (fs.existsSync(indexPath)) {
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    if (indexData.name === testConfig.expectedName) {
      console.log(`  ✅ Name matches: ${indexData.name}`);
      langResult.tests.push('name: PASS');
    } else {
      console.log(`  ❌ Name mismatch: expected ${testConfig.expectedName}, got ${indexData.name}`);
      langResult.issues.push(`Name mismatch`);
      langResult.isValid = false;
    }
    
    if (indexData.flag === testConfig.expectedFlag) {
      console.log(`  ✅ Flag matches: ${indexData.flag}`);
      langResult.tests.push('flag: PASS');
    } else {
      console.log(`  ❌ Flag mismatch: expected ${testConfig.expectedFlag}, got ${indexData.flag}`);
      langResult.issues.push(`Flag mismatch`);
      langResult.isValid = false;
    }
  } else {
    console.log(`  ❌ index.json not found`);
    langResult.issues.push('index.json missing');
    langResult.isValid = false;
  }
  
  // 2. Test language rules configuration
  const rulesPath = path.join(configDir, 'languageRules.ts');
  if (fs.existsSync(rulesPath)) {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    
    // Check if language has rules configuration
    if (rulesContent.includes(`${testConfig.code}:`)) {
      console.log(`  ✅ Language rules configured`);
      langResult.tests.push('rules: CONFIGURED');
      
      // Basic validation of expected rule properties
      if (testConfig.expectedCaseSensitive && rulesContent.includes('caseSensitive: true')) {
        console.log(`    ✅ Case sensitive setting correct`);
      } else if (!testConfig.expectedCaseSensitive && rulesContent.includes('caseSensitive: false')) {
        console.log(`    ✅ Case insensitive setting correct`);
      }
      
      if (testConfig.expectedCapitalizationRequired && rulesContent.includes('capitalizationRequired: true')) {
        console.log(`    ✅ Capitalization requirement correct`);
      } else if (!testConfig.expectedCapitalizationRequired && rulesContent.includes('capitalizationRequired: false')) {
        console.log(`    ✅ No capitalization requirement correct`);
      }
      
    } else {
      console.log(`  ⚠️  Using default rules (no specific configuration)`);
      langResult.tests.push('rules: DEFAULT');
    }
  }
  
  // 3. Test module availability
  console.log(`  📚 Testing modules:`);
  for (const moduleId of testConfig.expectedModules) {
    const modulePath = path.join(dataDir, testConfig.code, `${moduleId}.json`);
    if (fs.existsSync(modulePath)) {
      const moduleData = JSON.parse(fs.readFileSync(modulePath, 'utf8'));
      if (moduleData.words && moduleData.words.length > 0) {
        console.log(`    ✅ Module ${moduleId}: ${moduleData.words.length} words`);
        langResult.tests.push(`module-${moduleId}: PASS (${moduleData.words.length} words)`);
        
        // 4. Test sample words exist
        let sampleWordsFound = 0;
        for (const sampleWord of testConfig.sampleWords) {
          const wordExists = moduleData.words.some(word => 
            word.term === sampleWord || word.definition === sampleWord
          );
          if (wordExists) {
            sampleWordsFound++;
          }
        }
        
        if (sampleWordsFound > 0) {
          console.log(`    ✅ Sample words found: ${sampleWordsFound}/${testConfig.sampleWords.length}`);
          langResult.tests.push(`sample-words: ${sampleWordsFound}/${testConfig.sampleWords.length}`);
        } else {
          console.log(`    ⚠️  No sample words found in module`);
          langResult.tests.push('sample-words: NONE FOUND');
        }
      } else {
        console.log(`    ❌ Module ${moduleId} has no words`);
        langResult.issues.push(`Module ${moduleId} empty`);
        langResult.isValid = false;
      }
    } else {
      console.log(`    ❌ Module ${moduleId} not found`);
      langResult.issues.push(`Module ${moduleId} missing`);
      langResult.isValid = false;
    }
  }
  
  // 5. Test data file consistency
  const dataFilePath = path.join(dataDir, `${testConfig.code}.json`);
  if (fs.existsSync(dataFilePath)) {
    console.log(`  ⚠️  Legacy data file found: ${testConfig.code}.json (consider removing)`);
    langResult.tests.push('legacy-file: FOUND');
  } else {
    console.log(`  ✅ No legacy data file (clean structure)`);
    langResult.tests.push('legacy-file: CLEAN');
  }
  
  if (langResult.isValid) {
    console.log(`  🎉 ${testConfig.code.toUpperCase()} configuration is complete and valid\n`);
  } else {
    console.log(`  ❌ ${testConfig.code.toUpperCase()} has configuration issues:\n`);
    langResult.issues.forEach(issue => console.log(`    - ${issue}`));
    console.log('');
    allValid = false;
  }
  
  validationResults.push(langResult);
}

// Final summary
console.log('📊 Final Validation Summary:');
console.log(`  Languages tested: ${validationResults.length}`);
console.log(`  Fully valid: ${validationResults.filter(r => r.isValid).length}`);
console.log(`  With issues: ${validationResults.filter(r => !r.isValid).length}`);

if (allValid) {
  console.log('\n🎉 All language configurations are complete and properly integrated!');
  
  console.log('\n📋 Test Results Summary:');
  validationResults.forEach(result => {
    console.log(`\n${result.code.toUpperCase()}:`);
    result.tests.forEach(test => console.log(`  ${test}`));
  });
  
  console.log('\n✅ Ready for production use!');
  process.exit(0);
} else {
  console.log('\n⚠️  Configuration issues detected. Please review and fix the problems above.');
  process.exit(1);
}
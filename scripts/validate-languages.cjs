#!/usr/bin/env node

// Simple validation test for language configurations
const fs = require('fs');
const path = require('path');

console.log('🔍 Validating Language Configurations...\n');

const dataDir = path.join(__dirname, '../src/data');
const configDir = path.join(__dirname, '../src/config');

// Check if directories exist
if (!fs.existsSync(dataDir)) {
  console.error('❌ Data directory not found:', dataDir);
  process.exit(1);
}

if (!fs.existsSync(configDir)) {
  console.error('❌ Config directory not found:', configDir);
  process.exit(1);
}

// Get all language directories
const languageDirs = fs.readdirSync(dataDir)
  .filter(item => {
    const itemPath = path.join(dataDir, item);
    return fs.statSync(itemPath).isDirectory();
  });

console.log(`📁 Found ${languageDirs.length} language directories: ${languageDirs.join(', ')}\n`);

let allValid = true;
const validationResults = [];

for (const langCode of languageDirs) {
  console.log(`📋 Validating language: ${langCode}`);
  
  const langDir = path.join(dataDir, langCode);
  const indexPath = path.join(langDir, 'index.json');
  
  let langResult = {
    code: langCode,
    isValid: true,
    issues: [],
    modules: []
  };
  
  // 1. Check if index.json exists
  if (!fs.existsSync(indexPath)) {
    langResult.issues.push('Missing index.json');
    langResult.isValid = false;
  } else {
    try {
      // 2. Validate index.json structure
      const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      
      if (!indexData.name) {
        langResult.issues.push('Missing name in index.json');
        langResult.isValid = false;
      } else {
        console.log(`  ✅ Name: ${indexData.name}`);
      }
      
      if (!indexData.flag) {
        langResult.issues.push('Missing flag in index.json');
        langResult.isValid = false;
      } else {
        console.log(`  ✅ Flag: ${indexData.flag}`);
      }
      
      if (!indexData.modules || !Array.isArray(indexData.modules)) {
        langResult.issues.push('Missing or invalid modules array');
        langResult.isValid = false;
      } else {
        console.log(`  ✅ Modules defined: ${indexData.modules.length}`);
        
        // 3. Validate each module
        for (const moduleInfo of indexData.modules) {
          const modulePath = path.join(langDir, `${moduleInfo.id}.json`);
          
          if (!fs.existsSync(modulePath)) {
            langResult.issues.push(`Module file missing: ${moduleInfo.id}.json`);
            langResult.isValid = false;
          } else {
            try {
              const moduleData = JSON.parse(fs.readFileSync(modulePath, 'utf8'));
              
              if (!moduleData.words || !Array.isArray(moduleData.words)) {
                langResult.issues.push(`Module ${moduleInfo.id} has no words array`);
                langResult.isValid = false;
              } else {
                console.log(`    ✅ Module ${moduleInfo.id}: ${moduleData.words.length} words`);
                langResult.modules.push({
                  id: moduleInfo.id,
                  name: moduleInfo.name,
                  wordCount: moduleData.words.length
                });
              }
            } catch (error) {
              langResult.issues.push(`Module ${moduleInfo.id} has invalid JSON: ${error.message}`);
              langResult.isValid = false;
            }
          }
        }
      }
      
    } catch (error) {
      langResult.issues.push(`Invalid JSON in index.json: ${error.message}`);
      langResult.isValid = false;
    }
  }
  
  // 4. Check if language rules exist
  const rulesPath = path.join(configDir, 'languageRules.ts');
  if (fs.existsSync(rulesPath)) {
    const rulesContent = fs.readFileSync(rulesPath, 'utf8');
    if (rulesContent.includes(`${langCode}:`)) {
      console.log(`  ✅ Language rules configured`);
    } else {
      console.log(`  ⚠️  No specific language rules (using defaults)`);
    }
  }
  
  if (langResult.isValid) {
    console.log(`  ✅ ${langCode} is valid\n`);
  } else {
    console.log(`  ❌ ${langCode} has issues:`);
    langResult.issues.forEach(issue => console.log(`    - ${issue}`));
    console.log('');
    allValid = false;
  }
  
  validationResults.push(langResult);
}

// Summary
console.log('📊 Validation Summary:');
console.log(`  Total languages: ${validationResults.length}`);
console.log(`  Valid languages: ${validationResults.filter(r => r.isValid).length}`);
console.log(`  Invalid languages: ${validationResults.filter(r => !r.isValid).length}`);

if (allValid) {
  console.log('\n🎉 All language configurations are valid!');
  
  // Show detailed configuration
  console.log('\n📋 Configuration Details:');
  validationResults.forEach(result => {
    console.log(`\n${result.code.toUpperCase()}:`);
    result.modules.forEach(module => {
      console.log(`  📚 ${module.name} (${module.id}): ${module.wordCount} words`);
    });
  });
  
  process.exit(0);
} else {
  console.log('\n⚠️  Some configurations need attention. Please fix the issues above.');
  process.exit(1);
}
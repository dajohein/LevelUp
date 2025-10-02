// Validation script for language configurations
import { getAvailableLanguages, getModule } from '../services/moduleService';
import { getLanguageRules } from '../config/languageRules';
import { validateLanguageConfig } from '../config/languageConfig';

interface LanguageValidationResult {
  code: string;
  isValid: boolean;
  issues: string[];
  config: {
    info: any;
    rules: any;
    modules: Array<{
      id: string;
      name: string;
      wordCount: number;
      difficulty: string;
    }>;
  };
}

/**
 * Validates all language configurations are complete and working
 */
export const validateAllLanguageConfigs = (): {
  isValid: boolean;
  languages: Array<LanguageValidationResult>;
  summary: {
    totalLanguages: number;
    validLanguages: number;
    invalidLanguages: number;
    issues: string[];
  };
} => {
  const results: {
    isValid: boolean;
    languages: Array<LanguageValidationResult>;
    summary: {
      totalLanguages: number;
      validLanguages: number;
      invalidLanguages: number;
      issues: string[];
    };
  } = {
    isValid: true,
    languages: [],
    summary: {
      totalLanguages: 0,
      validLanguages: 0,
      invalidLanguages: 0,
      issues: [],
    },
  };

  try {
    // Get all available languages
    const availableLanguages = getAvailableLanguages();
    results.summary.totalLanguages = availableLanguages.length;

    console.log(`🔍 Validating ${availableLanguages.length} languages...`);

    for (const { code, info } of availableLanguages) {
      const languageResult: LanguageValidationResult = {
        code,
        isValid: true,
        issues: [],
        config: {
          info,
          rules: null,
          modules: [],
        },
      };

      console.log(`\n📋 Validating language: ${code} (${info.name})`);

      // 1. Validate basic language info
      if (!info.name) {
        languageResult.issues.push('Missing language name');
        languageResult.isValid = false;
      }

      if (!info.flag) {
        languageResult.issues.push('Missing language flag');
        languageResult.isValid = false;
      }

      if (!info.modules || info.modules.length === 0) {
        languageResult.issues.push('No modules defined');
        languageResult.isValid = false;
      }

      // 2. Validate language rules
      try {
        const rules = getLanguageRules(code);
        languageResult.config.rules = rules;
        console.log(
          `  ✅ Language rules loaded: caseSensitive=${rules.caseSensitive}, capitalizationRequired=${rules.capitalizationRequired}`
        );
      } catch (error) {
        languageResult.issues.push(`Failed to load language rules: ${error}`);
        languageResult.isValid = false;
      }

      // 3. Validate modules
      if (info.modules) {
        for (const moduleInfo of info.modules) {
          console.log(`  📚 Validating module: ${moduleInfo.id} (${moduleInfo.name})`);

          try {
            const module = getModule(code, moduleInfo.id);
            if (!module) {
              languageResult.issues.push(`Module ${moduleInfo.id} could not be loaded`);
              languageResult.isValid = false;
            } else {
              if (!module.words || module.words.length === 0) {
                languageResult.issues.push(`Module ${moduleInfo.id} has no words`);
                languageResult.isValid = false;
              } else {
                console.log(`    ✅ Module loaded with ${module.words.length} words`);
                languageResult.config.modules.push({
                  id: moduleInfo.id,
                  name: moduleInfo.name,
                  wordCount: module.words.length,
                  difficulty: moduleInfo.difficulty,
                });
              }
            }
          } catch (error) {
            languageResult.issues.push(`Failed to load module ${moduleInfo.id}: ${error}`);
            languageResult.isValid = false;
          }
        }
      }

      // 4. Validate using the validateLanguageConfig function
      const configValidation = validateLanguageConfig({
        code,
        name: info.name,
        from: info.from,
        flag: info.flag,
        modules: info.modules || [],
      });

      if (!configValidation) {
        languageResult.issues.push('Failed general language config validation');
        languageResult.isValid = false;
      }

      if (languageResult.isValid) {
        results.summary.validLanguages++;
        console.log(`  ✅ Language ${code} is valid`);
      } else {
        results.summary.invalidLanguages++;
        results.isValid = false;
        console.log(`  ❌ Language ${code} has issues:`, languageResult.issues);
      }

      results.languages.push(languageResult);
    }

    // Generate summary
    console.log(`\n📊 Validation Summary:`);
    console.log(`  Total languages: ${results.summary.totalLanguages}`);
    console.log(`  Valid languages: ${results.summary.validLanguages}`);
    console.log(`  Invalid languages: ${results.summary.invalidLanguages}`);

    if (results.isValid) {
      console.log(`\n🎉 All language configurations are valid!`);
    } else {
      console.log(`\n⚠️  Some language configurations have issues.`);
      results.summary.issues = results.languages
        .filter((lang: LanguageValidationResult) => !lang.isValid)
        .flatMap((lang: LanguageValidationResult) =>
          lang.issues.map((issue: string) => `${lang.code}: ${issue}`)
        );
    }
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    results.isValid = false;
    results.summary.issues.push(`Validation error: ${error}`);
  }

  return results;
};

// Export individual validation functions for testing
export const validateSingleLanguage = (languageCode: string) => {
  const allResults = validateAllLanguageConfigs();
  return allResults.languages.find(lang => lang.code === languageCode);
};

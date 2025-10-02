// Language configuration for adding new languages to the application

export interface LanguageConfig {
  code: string;
  name: string;
  from: string;
  flag: string;
  modules: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  }>;
  rules?: {
    caseSensitive?: boolean;
    capitalizationRequired?: boolean;
    articles?: string[];
    nounPatterns?: RegExp[];
    capitalizationFeedback?: {
      minor: string;
      moderate: string;
      major: string;
    };
  };
}

/**
 * Instructions for adding a new language:
 *
 * 1. Create language data directory:
 *    - Create folder: `src/data/{languageCode}/`
 *    - Add `index.json` with language info
 *    - Add module files (e.g., `basic-vocabulary.json`)
 *
 * 2. Update language rules (if needed):
 *    - Edit `src/config/languageRules.ts`
 *    - Add language-specific validation rules
 *
 * 3. Language files structure:
 *    ```
 *    src/data/{languageCode}/
 *    ├── index.json              # Language metadata
 *    └── {module-id}.json        # Module content
 *    ```
 *
 * 4. Language metadata format (index.json):
 *    ```json
 *    {
 *      "name": "Language Name",
 *      "from": "Source Language",
 *      "flag": "🏁",
 *      "modules": [
 *        {
 *          "id": "module-id",
 *          "name": "Module Name",
 *          "description": "Module description",
 *          "icon": "📚",
 *          "difficulty": "beginner"
 *        }
 *      ]
 *    }
 *    ```
 *
 * 5. Module content format:
 *    ```json
 *    {
 *      "id": "module-id",
 *      "name": "Module Name",
 *      "description": "Module description",
 *      "icon": "📚",
 *      "difficulty": "beginner",
 *      "words": [
 *        {
 *          "id": "unique-id",
 *          "term": "source word",
 *          "definition": "target translation",
 *          "direction": "term-to-definition",
 *          "audio": "optional-audio-url",
 *          "context": {
 *            "sentence": "Example sentence",
 *            "translation": "Sentence translation"
 *          }
 *        }
 *      ]
 *    }
 *    ```
 *
 * The application will automatically discover and load new languages
 * when they follow this structure.
 */

// Example configuration for a new language
export const exampleLanguageConfig: LanguageConfig = {
  code: 'fr',
  name: 'French',
  from: 'English',
  flag: '🇫🇷',
  modules: [
    {
      id: 'basic-vocabulary',
      name: 'Basic Vocabulary',
      description: 'Essential French words for daily conversation',
      icon: '🇫🇷',
      difficulty: 'beginner',
    },
  ],
  rules: {
    caseSensitive: false,
    capitalizationRequired: false,
  },
};

// Currently supported languages (auto-discovered from data directory)
export const getSupportedLanguages = (): string[] => {
  // This would ideally scan the data directory at build time
  // For now, returning known languages
  return ['de', 'es'];
};

// Utility function to validate language configuration
export const validateLanguageConfig = (config: LanguageConfig): boolean => {
  if (!config.code || !config.name || !config.flag) {
    console.error('Missing required language configuration fields');
    return false;
  }

  if (!config.modules || config.modules.length === 0) {
    console.error('Language must have at least one module');
    return false;
  }

  return true;
};

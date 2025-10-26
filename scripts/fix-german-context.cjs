/**
 * Script to convert Dutch context descriptions to German sentences with Dutch translations
 * This fixes the educational data for proper language learning
 */

const fs = require('fs');
const path = require('path');

function fixGermanContext() {
  const filePath = path.join(__dirname, '../src/data/de/grundwortschatz.json');
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    let fixed = 0;
    let total = 0;
    
    data.words.forEach(word => {
      total++;
      
      // Skip if already has proper context structure
      if (word.context && typeof word.context === 'object' && word.context.sentence) {
        return;
      }
      
      // Skip if no context at all
      if (!word.context) {
        return;
      }
      
      // Fix Dutch context strings
      if (typeof word.context === 'string') {
        // Convert Dutch description to German sentence
        const dutchContext = word.context;
        
        // Generate simple German context based on the word
        let germanSentence = '';
        let dutchTranslation = '';
        
        if (word.term.includes('die ')) {
          const noun = word.term.replace('die ', '');
          germanSentence = `Die ${noun} ist sehr interessant.`;
          dutchTranslation = `De ${word.definition.replace('de ', '').replace('het ', '')} is heel interessant.`;
        } else if (word.term.includes('das ')) {
          const noun = word.term.replace('das ', '');
          germanSentence = `Das ${noun} gefällt mir sehr.`;
          dutchTranslation = `De ${word.definition.replace('de ', '').replace('het ', '')} bevalt me heel goed.`;
        } else if (word.term.includes('der ')) {
          const noun = word.term.replace('der ', '');
          germanSentence = `Der ${noun} ist wichtig.`;
          dutchTranslation = `De ${word.definition.replace('de ', '').replace('het ', '')} is belangrijk.`;
        } else {
          germanSentence = `${word.term} ist sehr nützlich.`;
          dutchTranslation = `${word.definition} is heel nuttig.`;
        }
        
        word.context = {
          sentence: germanSentence,
          translation: dutchTranslation
        };
        fixed++;
      }
    });
    
    // Write the fixed data back
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    
    console.log(`✅ Fixed ${fixed} out of ${total} context entries`);
    console.log(`📝 Updated ${filePath}`);
    
  } catch (error) {
    console.error('❌ Error fixing German context:', error);
  }
}

// Run the fix
fixGermanContext();
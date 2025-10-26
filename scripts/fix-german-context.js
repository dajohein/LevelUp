/**
 * Script to convert Dutch context descriptions to German sentences with Dutch translations
 * This fixes the educational data for proper language learning
 */

const fs = require('fs');
const path = require('path');

// Common German sentence patterns for different categories
const contextTemplates = {
  'muziekinstrumenten': {
    'die Gitarre': { sentence: 'Ich spiele gerne Gitarre am Abend.', translation: 'Ik speel graag gitaar \'s avonds.' },
    'die Geige': { sentence: 'Sie lernt seit drei Jahren Geige spielen.', translation: 'Ze leert al drie jaar viool spelen.' },
    'das Schlagzeug': { sentence: 'Das Schlagzeug ist sehr laut und rhythmisch.', translation: 'Het drumstel is heel luid en ritmisch.' },
    'das Klavier': { sentence: 'Das Klavier steht im Wohnzimmer.', translation: 'De piano staat in de woonkamer.' }
  },
  'vrije tijd': {
    'das Hobby': { sentence: 'Mein liebstes Hobby ist das Lesen.', translation: 'Mijn liefste hobby is lezen.' },
    'die Ferien': { sentence: 'Ich freue mich schon auf die Sommerferien.', translation: 'Ik verheug me al op de zomervakantie.' }
  },
  'activiteiten': {
    'Sport machen': { sentence: 'Jeden Tag sollte man etwas Sport machen.', translation: 'Elke dag zou je wat sport moeten doen.' }
  },
  'plaatsen': {
    'die Stadt': { sentence: 'Die Stadt ist sehr groß und schön.', translation: 'De stad is heel groot en mooi.' }
  }
};

// Fallback generator for common word types
function generateContext(term, category) {
  // Simple fallback patterns based on the German word
  if (term.includes('die ')) {
    const noun = term.replace('die ', '');
    return {
      sentence: `Die ${noun} ist sehr wichtig.`,
      translation: `De ${category} is heel belangrijk.`
    };
  } else if (term.includes('das ')) {
    const noun = term.replace('das ', '');
    return {
      sentence: `Das ${noun} gefällt mir gut.`,
      translation: `De ${category} bevalt me goed.`
    };
  } else if (term.includes('der ')) {
    const noun = term.replace('der ', '');
    return {
      sentence: `Der ${noun} ist interessant.`,
      translation: `De ${category} is interessant.`
    };
  } else {
    return {
      sentence: `${term} ist sehr nützlich.`,
      translation: `${term} is heel nuttig.`
    };
  }
}

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
        const category = word.category || 'general';
        
        // Use template if available
        if (contextTemplates[category] && contextTemplates[category][word.term]) {
          word.context = contextTemplates[category][word.term];
          fixed++;
        } else {
          // Generate fallback context
          word.context = generateContext(word.term, category);
          fixed++;
        }
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
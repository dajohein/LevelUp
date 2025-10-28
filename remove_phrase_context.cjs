#!/usr/bin/env node

/**
 * Remove redundant context from phrase modules
 * Context is only useful for single words, not complete phrases
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/data/es/frases-clave.json');

try {
  // Read the current file
  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);
  
  console.log(`📖 Processing ${data.name} module...`);
  console.log(`📊 Found ${data.words.length} entries`);
  
  let contextRemovedCount = 0;
  
  // Remove context from all entries since they are phrases
  data.words = data.words.map(word => {
    if (word.context) {
      contextRemovedCount++;
      const { context, ...wordWithoutContext } = word;
      return wordWithoutContext;
    }
    return word;
  });
  
  // Write the updated file
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  
  console.log(`✅ Removed context from ${contextRemovedCount} phrase entries`);
  console.log(`💾 Updated ${filePath}`);
  
} catch (error) {
  console.error('❌ Error processing file:', error.message);
  process.exit(1);
}
#!/usr/bin/env node

/**
 * Script to add explicit blank markers to German word context sentences
 * This avoids fragile regex guessing in the UI components
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../src/data/de/grundwortschatz.json');

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function addBlankMarkers(data) {
  const words = data.words;
  let processed = 0;
  let skipped = 0;

  for (const word of words) {
    if (!word.context || !word.context.sentence) {
      skipped++;
      continue;
    }

    const sentence = word.context.sentence;
    const germanWord = word.term;
    
    // Try to find the German word in the sentence and replace with blank marker
    let sentenceWithBlank = sentence;
    let found = false;

    // Candidates to try (exact word, without article, word parts)
    const candidates = [];
    
    // Add exact term
    candidates.push(germanWord.trim());
    
    // Add without German articles
    const withoutArticle = germanWord.replace(/^(der|die|das|ein|eine)\s+/i, '').trim();
    if (withoutArticle !== germanWord.trim()) {
      candidates.push(withoutArticle);
    }
    
    // Add individual words for compound terms
    const wordParts = withoutArticle.split(/\s+/).filter(Boolean);
    for (const part of wordParts) {
      if (part.length > 2) {
        candidates.push(part);
      }
    }

    // Try each candidate with word boundary matching
    for (const candidate of candidates) {
      const pattern = new RegExp('\\b' + escapeRegExp(candidate) + '\\b', 'i');
      const match = pattern.exec(sentence);
      
      if (match) {
        sentenceWithBlank = sentence.replace(pattern, '{BLANK}');
        found = true;
        break;
      }
    }

    if (!found) {
      console.warn(`Could not find word "${germanWord}" in sentence "${sentence}"`);
      // Create a generic blank at the end for now
      sentenceWithBlank = sentence + ' {BLANK}';
    }

    // Add the sentenceWithBlank field
    word.context.sentenceWithBlank = sentenceWithBlank;
    processed++;
  }

  console.log(`Processed: ${processed}, Skipped: ${skipped}`);
  return data;
}

function main() {
  try {
    // Read the current data
    const rawData = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(rawData);
    
    console.log('Adding blank markers to German word data...');
    
    // Process the data
    const updatedData = addBlankMarkers(data);
    
    // Write back to file
    fs.writeFileSync(DATA_FILE, JSON.stringify(updatedData, null, 2) + '\n');
    
    console.log(`✅ Successfully updated ${DATA_FILE}`);
    
  } catch (error) {
    console.error('Error processing data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { addBlankMarkers };
/**
 * Split a displayed translation into answer alternatives without treating commas
 * inside explanatory parentheses as separators.
 */
export const getTranslationAlternatives = (definition: string): string[] => {
  const alternatives: string[] = [];
  let current = '';
  let parenthesisDepth = 0;

  for (const character of definition) {
    if (character === '(') parenthesisDepth++;
    if (character === ')' && parenthesisDepth > 0) parenthesisDepth--;

    if (character === ',' && parenthesisDepth === 0) {
      if (current.trim()) alternatives.push(current.trim().toLowerCase());
      current = '';
    } else {
      current += character;
    }
  }

  if (current.trim()) alternatives.push(current.trim().toLowerCase());
  return alternatives;
};

export const hasEquivalentTranslation = (first: string, second: string): boolean => {
  const firstAlternatives = new Set(getTranslationAlternatives(first));
  return getTranslationAlternatives(second).some(alternative => firstAlternatives.has(alternative));
};

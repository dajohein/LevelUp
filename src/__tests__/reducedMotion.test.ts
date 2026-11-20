import fs from 'fs';
import path from 'path';

const css = fs.readFileSync(path.join(__dirname, '..', 'index.css'), 'utf8');
const confetti = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'animations', 'Confetti.tsx'),
  'utf8'
);

const reducedBlock = (source: string) => {
  const start = source.indexOf('@media (prefers-reduced-motion: reduce)');
  if (start === -1) return '';
  let depth = 0;
  for (let i = source.indexOf('{', start); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  return '';
};

describe('reduced motion', () => {
  const block = reducedBlock(css);

  it('has a global prefers-reduced-motion fallback in the base CSS', () => {
    expect(block).not.toBe('');
  });

  it('stops infinite animations and shortens animations and transitions', () => {
    expect(block).toMatch(/animation-iteration-count:\s*1\s*!important/);
    expect(block).toMatch(/animation-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/transition-duration:\s*0\.01ms\s*!important/);
    expect(block).toMatch(/scroll-behavior:\s*auto/);
  });

  it('applies only inside the media query, so ordinary motion is untouched', () => {
    expect(css.replace(block, '')).not.toMatch(/animation-iteration-count:\s*1\s*!important/);
  });

  it('hides decorative confetti', () => {
    expect(reducedBlock(confetti)).toMatch(/display:\s*none/);
  });

  it('skeleton loaders with !important animation rules repeat the reduced-motion override', () => {
    const loading = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'feedback', 'UnifiedLoading.tsx'),
      'utf8'
    );
    const synced = loading.slice(loading.indexOf('const SyncedSkeletonContainer'));
    expect(synced).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*&\s*\*\s*\{\s*animation:\s*none\s*!important/
    );
  });

  it('keeps the level-up exit state until the notification unmounts', () => {
    const levelUp = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'animations', 'LevelUpNotification.tsx'),
      'utf8'
    );
    expect(levelUp).toMatch(/levelUpExit : levelUpEntrance\} 0\.8s ease-out forwards/);
  });
});

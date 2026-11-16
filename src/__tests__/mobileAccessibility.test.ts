import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('mobile accessibility defaults', () => {
  it('allows browser zoom while retaining safe-area viewport support', () => {
    const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const document = new DOMParser().parseFromString(html, 'text/html');
    const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute('content');

    expect(viewport).toBeDefined();
    expect(viewport).toMatch(/viewport-fit\s*=\s*cover/i);
    expect(viewport).not.toMatch(/maximum-scale\s*=/i);
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)/i);
  });

  it('does not suppress selection or zoom gestures on the page', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    try {
      const rules = Array.from(style.sheet!.cssRules).filter(
        (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule
      );
      for (const selector of ['html', 'body', '#root', '*']) {
        const matchingRules = rules.filter(rule =>
          rule.selectorText.split(',').some(part => part.trim() === selector)
        );
        for (const rule of matchingRules) {
          expect(rule.style.getPropertyValue('user-select')).not.toBe('none');
          expect(rule.style.getPropertyValue('-webkit-user-select')).not.toBe('none');
          expect(rule.style.getPropertyValue('touch-action')).not.toMatch(/^(none|manipulation)$/);
        }
      }
    } finally {
      style.remove();
    }
  });
});

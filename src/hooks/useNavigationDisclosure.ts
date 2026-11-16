import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * Manages a non-modal navigation disclosure with normal Tab order.
 * @param resetKey - Route or viewport identity; changes dismiss the disclosure.
 */
export function useNavigationDisclosure(resetKey: string) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [resetKey]);

  useEffect(() => {
    if (!isOpen) return;

    panelRef.current?.querySelector<HTMLElement>('a[href], button:not([disabled])')?.focus();

    const dismissOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const dismissOnFocusOutside = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        event.target !== triggerRef.current &&
        !panelRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    document.addEventListener('mousedown', dismissOutside);
    document.addEventListener('focusin', dismissOnFocusOutside);
    document.addEventListener('keydown', dismissOnEscape);
    return () => {
      document.removeEventListener('mousedown', dismissOutside);
      document.removeEventListener('focusin', dismissOnFocusOutside);
      document.removeEventListener('keydown', dismissOnEscape);
    };
  }, [isOpen, close]);

  return { isOpen, setIsOpen, close, panelId, containerRef, triggerRef, panelRef };
}

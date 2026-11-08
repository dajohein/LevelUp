import React, { useLayoutEffect, useRef } from 'react';

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  initialFocusRef: React.RefObject<HTMLElement>;
  dismissDisabled?: boolean;
  closeOnBackdrop?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Presents a native modal, restoring focus to the opener when it closes.
 * Escape and optional backdrop dismissal are blocked while dismissal is disabled.
 */
export const ModalDialog: React.FC<ModalDialogProps> = ({
  isOpen,
  onClose,
  labelledBy,
  describedBy,
  initialFocusRef,
  dismissDisabled = false,
  closeOnBackdrop = false,
  className,
  children,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen || !dialog) return;

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    initialFocusRef.current?.focus();

    return () => {
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen, initialFocusRef]);

  useLayoutEffect(() => {
    if (isOpen && dismissDisabled) dialogRef.current?.focus();
  }, [isOpen, dismissDisabled]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className={className}
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      tabIndex={-1}
      onCancel={event => {
        event.preventDefault();
        if (!dismissDisabled) onClose();
      }}
      onKeyDown={event => {
        if (event.key !== 'Tab') return;
        const focusable = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button, input, select, textarea, [tabindex]'
          )
        ).filter(
          element =>
            element.tabIndex >= 0 &&
            !element.matches(':disabled') &&
            element.getClientRects().length > 0 &&
            getComputedStyle(element).visibility !== 'hidden'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) {
          event.preventDefault();
          event.currentTarget.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === event.currentTarget)
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={event => {
        if (!closeOnBackdrop || dismissDisabled || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        ) {
          onClose();
        }
      }}
    >
      {children}
    </dialog>
  );
};

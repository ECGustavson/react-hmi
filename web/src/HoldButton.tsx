// A button that can require a press-and-hold before it acts.
//
// holdMs 0 (default): a normal button, acts on tap.
// holdMs > 0: acts only after being held that long. A fill bar shows progress. Releasing early,
// sliding off the button, or the button becoming disabled (e.g. PLC connection lost) cancels it.
// Works with touch, mouse, and Enter/Space on a keyboard.

import { CSSProperties, KeyboardEvent, PointerEvent, ReactNode, useEffect, useRef, useState } from 'react';

type Props = {
  holdMs?: number;
  onActivate: () => void;
  className?: string;
  disabled?: boolean;
  children: ReactNode;
};

export function HoldButton({ holdMs = 0, onActivate, className = '', disabled = false, children }: Props) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  const activate = useRef(onActivate);
  activate.current = onActivate;   // always call the latest handler, even if it changed mid-hold

  const cancel = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };

  const start = () => {
    if (disabled || timer.current !== undefined) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      timer.current = undefined;
      setHolding(false);
      activate.current();
    }, holdMs);
  };

  // Stop a hold in progress if the button gets disabled, and on unmount
  useEffect(() => { if (disabled) cancel(); }, [disabled]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (holdMs <= 0) {
    return <button className={className} disabled={disabled} onClick={onActivate}>{children}</button>;
  }

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;   // left button / touch / pen only
    // Touch captures the pointer to this button by default, which would hide a slide-off.
    // Releasing it lets pointerleave fire, so sliding a finger off cancels the hold.
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    start();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); }
  };
  const onKeyUp = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') cancel();
  };

  return (
    <button
      className={`${className} hold${holding ? ' holding' : ''}`}
      style={{ '--hold-ms': `${holdMs}ms` } as CSSProperties}
      disabled={disabled}
      onPointerDown={onPointerDown}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}   // a long touch otherwise opens the context menu
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onBlur={cancel}>
      {children}
      <span className="sr-only"> (press and hold)</span>
    </button>
  );
}

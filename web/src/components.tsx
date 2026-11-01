// Reusable HMI building blocks. Each takes a PLC tag name and handles its own reading and writing.
//
// minRole (default 'operator') sets who can use a control. Without the role, the control
// shows a lock, and tapping it opens the login dialog.
// holdMs (default 0) makes the control require a press-and-hold that long before it acts
// (see HoldButton). A locked control still opens the login dialog on a plain tap.

import { ReactNode, useState } from 'react';
import { useHmi, useSession, useTag } from './connection';
import { isAnalog } from './types';
import { Role } from './roles';
import { Numpad } from './Numpad';
import { TextPad } from './TextPad';
import { HoldButton } from './HoldButton';

// Plain number with a fixed unit, e.g. a DINT counter
export function Readout({ label, tag, unit = '', decimals = 0 }:
  { label: string; tag: string; unit?: string; decimals?: number }) {
  const { value } = useTag(tag);
  const text = typeof value === 'number' ? value.toFixed(decimals) : '--';
  return <Row label={label} unit={unit}><output>{text}</output></Row>;
}

// ST_Analog, read-only. Value and units come from the PLC.
export function AnalogReadout({ label, tag, decimals = 1 }:
  { label: string; tag: string; decimals?: number }) {
  const { value } = useTag(tag);
  const ok = isAnalog(value);
  return (
    <Row label={label} unit={ok ? value.sEU : ''}>
      <output>{ok ? value.fValue.toFixed(decimals) : '--'}</output>
    </Row>
  );
}

// ST_Analog, adjustable. Tap to open the numpad; range and units come from the PLC.
// Writes <tag>.fValue only, which is the only member the server allows.
export function SetpointEntry({ label, tag, decimals = 1, minRole = 'operator', holdMs = 0 }:
  { label: string; tag: string; decimals?: number; minRole?: Role; holdMs?: number }) {
  const { value, connected } = useTag(tag);
  const { write } = useTag(`${tag}.fValue`);
  const { can, promptLogin } = useSession();
  const [open, setOpen] = useState(false);
  const ok = isAnalog(value);
  const allowed = can(minRole);

  return (
    <Row label={label} unit={ok ? value.sEU : ''}>
      <HoldButton className={allowed ? 'entry' : 'entry locked'} disabled={!connected || !ok}
        holdMs={allowed ? holdMs : 0} onActivate={() => (allowed ? setOpen(true) : promptLogin())}>
        {!allowed && <LockIcon />}
        {ok ? value.fValue.toFixed(decimals) : '--'}
      </HoldButton>

      {/* Closes on its own if the connection drops or the login ends, so nothing is written by mistake */}
      {open && connected && ok && allowed && (
        <Numpad
          label={label} unit={value.sEU} value={value.fValue}
          min={value.fMin} max={value.fMax} decimals={decimals}
          onEnter={(v) => { write(v); setOpen(false); }}
          onCancel={() => setOpen(false)} />
      )}
    </Row>
  );
}

// STRING tag, read-only
export function TextReadout({ label, tag }: { label: string; tag: string }) {
  const { value } = useTag(tag);
  return (
    <Row label={label} wide>
      <output className="text">{typeof value === 'string' && value !== '' ? value : '--'}</output>
    </Row>
  );
}

// STRING tag, adjustable. Tap to open the on-screen keyboard.
// maxLength should match the tag's "length" in the tag map; the server rejects anything longer.
export function TextEntry({ label, tag, maxLength, allowEmpty = false, minRole = 'operator', holdMs = 0 }:
  { label: string; tag: string; maxLength: number; allowEmpty?: boolean; minRole?: Role; holdMs?: number }) {
  const { value, connected, write } = useTag(tag);
  const { can, promptLogin } = useSession();
  const [open, setOpen] = useState(false);
  const ok = typeof value === 'string';
  const allowed = can(minRole);

  return (
    <Row label={label} wide>
      <HoldButton className={allowed ? 'entry text' : 'entry text locked'} disabled={!connected || !ok}
        holdMs={allowed ? holdMs : 0} onActivate={() => (allowed ? setOpen(true) : promptLogin())}>
        {!allowed && <LockIcon />}
        {ok && value !== '' ? value : '--'}
      </HoldButton>

      {open && connected && ok && allowed && (
        <TextPad title={label} initial={value} maxLength={maxLength} allowEmpty={allowEmpty}
          onEnter={(text) => { write(text); setOpen(false); }}
          onCancel={() => setOpen(false)} />
      )}
    </Row>
  );
}

// Momentary command: sets a BOOL TRUE, and the PLC clears it after acting
export function CommandButton({ tag, children, className = '', disabled = false, minRole = 'operator', holdMs = 0 }:
  { tag: string; children: ReactNode; className?: string; disabled?: boolean; minRole?: Role; holdMs?: number }) {
  const { connected, write } = useTag(tag);
  const { can, promptLogin } = useSession();
  const allowed = can(minRole);

  return (
    <HoldButton className={allowed ? className : `${className} locked`} disabled={!connected || disabled}
      holdMs={allowed ? holdMs : 0} onActivate={() => (allowed ? write(true) : promptLogin())}>
      {!allowed && <LockIcon />}
      {children}
    </HoldButton>
  );
}

// Shared layout: label | value | units, or label | wide value for text.
// Values grey out while the PLC is disconnected (they're stale).
function Row({ label, unit = '', wide = false, children }:
  { label: string; unit?: string; wide?: boolean; children: ReactNode }) {
  const { connected } = useHmi();
  const classes = ['row', wide ? 'wide' : '', connected ? '' : 'stale'].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <label>{label}</label>
      {children}
      {!wide && <span className="unit">{unit}</span>}
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="lock" viewBox="0 0 16 16" aria-label="Locked" role="img">
      <rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

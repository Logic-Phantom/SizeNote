// 입력 폼 부품: 칩 선택, 길이 입력(단위 표시), 출처 선택, 설치 여유 3상태(확인 안 함 / 필요 없음 / 값).
import type { ReactNode } from 'react';
import type { Unit } from '../domain/units';

export function Field({ label, children, hint, error }: { label: ReactNode; children: ReactNode; hint?: ReactNode; error?: string | null }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}

export function ChipGroup<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={`chip${o.value === value ? ' active' : ''}`} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** 숫자 입력 + 단위 꼬리표. inputMode=decimal로 숫자 키패드 */
export function LengthInput({ value, onChange, unit, label, placeholder }: { value: string; onChange: (v: string) => void; unit: Unit; label: string; placeholder?: string }) {
  return (
    <div className="length-input">
      <input
        className="input"
        inputMode="decimal"
        enterKeyHint="done"
        aria-label={`${label}(${unit})`}
        value={value}
        placeholder={placeholder ?? '입력 안 함'}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className="length-unit" aria-hidden="true">
        {unit}
      </span>
    </div>
  );
}

export type ClearanceMode = 'UNKNOWN' | 'NONE' | 'VALUE';

/** 설치 여유: 비워 두면 '확인 안 함'(0으로 간주하지 않음) */
export function ClearanceInput({
  label,
  mode,
  value,
  unit,
  onMode,
  onValue,
  error,
}: {
  label: string;
  mode: ClearanceMode;
  value: string;
  unit: Unit;
  onMode: (m: ClearanceMode) => void;
  onValue: (v: string) => void;
  error?: string | null;
}) {
  return (
    <div className="clearance">
      <div className="clearance-head">
        <span className="clearance-label">{label}</span>
        <div className="mini-seg" role="radiogroup" aria-label={`${label} 설치 여유`}>
          {(
            [
              ['UNKNOWN', '확인 안 함'],
              ['NONE', '필요 없음'],
              ['VALUE', '입력'],
            ] as const
          ).map(([m, t]) => (
            <button key={m} type="button" role="radio" aria-checked={mode === m} className={mode === m ? 'active' : ''} onClick={() => onMode(m)}>
              {t}
            </button>
          ))}
        </div>
      </div>
      {mode === 'VALUE' && <LengthInput label={`${label} 여유`} value={value} onChange={onValue} unit={unit} placeholder="0" />}
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}

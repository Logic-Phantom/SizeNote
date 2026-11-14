// 단위 변환과 입력 검증. 내부 저장은 항상 정수 mm, 화면 기본 표시는 cm.
// 모든 변환은 이 파일만 거친다(화면에서 직접 *10, /10 하지 않는다).

export type Unit = 'cm' | 'mm';

/** 치수(가로·깊이·높이·통로 폭 등) 허용 범위: 1mm ~ 30m */
export const DIMENSION_MAX_MM = 30_000;
/** 설치 여유(좌·우·후면·상단·전면) 허용 범위: 0mm(여유 불필요 확인) ~ 3m */
export const CLEARANCE_MAX_MM = 3_000;

export type ParseResult = { ok: true; mm: number } | { ok: false; reason: 'empty' | 'invalid' | 'range' };

/**
 * 사용자가 입력한 문자열을 정수 mm로 바꾼다.
 * - 쉼표·공백 제거, 소수점은 cm 기준 한 자리까지 의미 있게 반영(92.55cm → 926mm, 반올림)
 * - allowZero: 설치 여유처럼 '0 = 필요 없음을 사용자가 확인'한 값만 0 허용
 */
export function parseLength(input: string, unit: Unit, opts: { allowZero?: boolean; maxMm?: number } = {}): ParseResult {
  const s = input.replace(/[,\s]/g, '');
  if (s === '') return { ok: false, reason: 'empty' };
  if (!/^\d+(\.\d+)?$/.test(s)) return { ok: false, reason: 'invalid' };
  const n = Number(s);
  if (!Number.isFinite(n)) return { ok: false, reason: 'invalid' };
  const mm = unit === 'cm' ? roundHalfUp(n * 10) : roundHalfUp(n);
  const max = opts.maxMm ?? DIMENSION_MAX_MM;
  if (mm > max) return { ok: false, reason: 'range' };
  if (mm === 0 && !opts.allowZero) return { ok: false, reason: 'range' };
  return { ok: true, mm };
}

/** 부동소수 오차(92.55*10=925.4999…)를 피한 반올림 */
export function roundHalfUp(n: number): number {
  return Math.round(Number(n.toFixed(6)));
}

export function cmToMm(cm: number): number {
  return roundHalfUp(cm * 10);
}

/** 925 → "92.5", 920 → "92" (불필요한 .0 생략) */
export function mmToCmText(mm: number): string {
  const cm = mm / 10;
  return Number.isInteger(cm) ? String(cm) : cm.toFixed(1);
}

/** 화면 표시용: 920 → "92cm", 단위 mm면 "920mm". null이면 "—" */
export function formatLength(mm: number | null | undefined, unit: Unit = 'cm'): string {
  if (mm == null) return '—';
  if (unit === 'mm') return `${mm.toLocaleString('ko-KR')}mm`;
  return `${Number(mmToCmText(mm)).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}cm`;
}

/** 입력칸에 다시 채울 때: mm → 선택 단위 문자열 */
export function toInputText(mm: number | null | undefined, unit: Unit): string {
  if (mm == null) return '';
  return unit === 'mm' ? String(mm) : mmToCmText(mm);
}

/** 저장된 값 방어: 유효한 정수 mm면 그대로, 아니면 null */
export function sanitizeMm(v: unknown, opts: { allowZero?: boolean; maxMm?: number } = {}): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || !Number.isInteger(v)) return null;
  if (v < 0 || v > (opts.maxMm ?? DIMENSION_MAX_MM)) return null;
  if (v === 0 && !opts.allowZero) return null;
  return v;
}

import { describe, expect, it } from 'vitest';
import { cmToMm, formatLength, mmToCmText, parseLength, sanitizeMm, toInputText } from '../src/domain/units';

describe('단위 변환', () => {
  it('cm → mm 정수', () => {
    expect(cmToMm(1)).toBe(10);
    expect(cmToMm(92)).toBe(920);
    expect(cmToMm(92.55)).toBe(926); // 부동소수 오차 없이 반올림
  });

  it('mm → cm 표시', () => {
    expect(mmToCmText(925)).toBe('92.5');
    expect(mmToCmText(920)).toBe('92');
    expect(formatLength(920)).toBe('92cm');
    expect(formatLength(1850, 'mm')).toBe('1,850mm');
    expect(formatLength(null)).toBe('—');
    expect(toInputText(925, 'cm')).toBe('92.5');
  });

  it('입력 문자열 파싱', () => {
    expect(parseLength('92', 'cm')).toEqual({ ok: true, mm: 920 });
    expect(parseLength('92.5', 'cm')).toEqual({ ok: true, mm: 925 });
    expect(parseLength('1,850', 'mm')).toEqual({ ok: true, mm: 1850 });
    expect(parseLength(' ', 'cm')).toEqual({ ok: false, reason: 'empty' });
  });

  it('0·음수·NaN·Infinity·지나치게 큰 값은 거부', () => {
    expect(parseLength('0', 'cm')).toEqual({ ok: false, reason: 'range' });
    expect(parseLength('-3', 'cm')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseLength('abc', 'cm')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseLength('Infinity', 'cm')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseLength('1e3', 'cm')).toEqual({ ok: false, reason: 'invalid' });
    expect(parseLength('3001', 'cm')).toEqual({ ok: false, reason: 'range' });
  });

  it('설치 여유는 사용자가 0을 입력하면 허용', () => {
    expect(parseLength('0', 'cm', { allowZero: true })).toEqual({ ok: true, mm: 0 });
  });

  it('저장값 방어', () => {
    expect(sanitizeMm(920)).toBe(920);
    expect(sanitizeMm(92.5)).toBeNull();
    expect(sanitizeMm(0)).toBeNull();
    expect(sanitizeMm(0, { allowZero: true })).toBe(0);
    expect(sanitizeMm(Number.NaN)).toBeNull();
    expect(sanitizeMm('920')).toBeNull();
  });
});

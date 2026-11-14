import { describe, expect, it } from 'vitest';
import { checkPassage } from '../src/domain/passage';
import type { PassageSegment } from '../src/domain/types';
import { product } from './fixtures';

const seg = (over: Partial<PassageSegment> = {}): PassageSegment => ({
  id: 'g1',
  name: '현관문',
  kind: 'FRONT_DOOR',
  widthMm: 900,
  heightMm: 2000,
  depthMm: null,
  turning: false,
  note: '',
  updatedAt: '2026-11-14T00:00:00.000Z',
  ...over,
});

describe('반입 경로 단순 선별', () => {
  it('직선·치수 충분 → 단순 통과', () => {
    const r = checkPassage(product(), [seg()], 'BODY', 'DEPTH'); // 깊이 700 < 900
    expect(r.status).toBe('SIMPLE_PASS');
  });

  it('폭·높이 초과도 "불가"가 아니라 추가 확인', () => {
    const r = checkPassage(product(), [seg({ widthMm: 650, heightMm: 1700 })], 'BODY', 'DEPTH');
    expect(r.status).toBe('REVIEW');
    expect(r.segments[0].reasons).toEqual(['WIDTH_SHORT', 'HEIGHT_SHORT']);
  });

  it('포장 치수 미입력이면 본체로 대체하지 않는다', () => {
    const r = checkPassage(product({ packageSize: null }), [seg()], 'PACKAGE', 'WIDTH');
    expect(r.status).toBe('REVIEW');
    expect(r.segments[0].reasons).toContain('PACKAGE_MISSING');
  });

  it('꺾임 여부 모름·꺾임 필요·계단은 항상 추가 확인', () => {
    expect(checkPassage(product(), [seg({ turning: null })], 'BODY', 'DEPTH').segments[0].reasons).toEqual(['TURNING_UNKNOWN']);
    expect(checkPassage(product(), [seg({ turning: true })], 'BODY', 'DEPTH').segments[0].reasons).toEqual(['TURNING_REQUIRED']);
    expect(checkPassage(product(), [seg({ kind: 'STAIRS' })], 'BODY', 'DEPTH').segments[0].reasons).toEqual(['STAIRS']);
  });

  it('통로 치수 누락·구간 없음 → 추가 확인', () => {
    expect(checkPassage(product(), [seg({ heightMm: null })], 'BODY', 'DEPTH').status).toBe('REVIEW');
    expect(checkPassage(product(), [], 'BODY', 'DEPTH').status).toBe('REVIEW');
  });
});

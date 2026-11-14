import { describe, expect, it } from 'vitest';
import { measureFromPhoto, screenToNorm, toCalibration } from '../src/domain/photo-measure';

// 1000×800 사진: 기준선 가로 300px = 300mm(줄자 30cm) → 1px = 1mm
const base = {
  imageWidth: 1000,
  imageHeight: 800,
  referencePoints: [
    { x: 0.1, y: 0.9 },
    { x: 0.4, y: 0.9 },
  ] as [{ x: number; y: number }, { x: number; y: number }],
  referenceMm: 300,
};

describe('사진 보조 측정(기준선 1개)', () => {
  it('같은 비율로 길이를 계산한다', () => {
    const r = measureFromPhoto({ ...base, targetPoints: [{ x: 0.1, y: 0.5 }, { x: 0.65, y: 0.5 }] });
    expect(r).toMatchObject({ ok: true, mm: 550, warnings: [] });
  });

  it('세로 방향은 사진 세로 픽셀로 환산한다(정규화 좌표의 가로세로 비율 반영)', () => {
    const r = measureFromPhoto({ ...base, targetPoints: [{ x: 0.5, y: 0.1 }, { x: 0.5, y: 0.6 }] }); // 0.5 × 800px = 400px
    expect(r.ok && r.mm).toBe(400);
  });

  it('기준선이 너무 짧거나 같은 점을 두 번 누르면 숫자를 내지 않는다', () => {
    expect(measureFromPhoto({ ...base, referencePoints: [{ x: 0.1, y: 0.1 }, { x: 0.12, y: 0.1 }], targetPoints: [{ x: 0, y: 0 }, { x: 1, y: 0 }] })).toEqual({
      ok: false,
      reason: 'REFERENCE_TOO_SHORT',
    });
    expect(measureFromPhoto({ ...base, targetPoints: [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }] })).toEqual({ ok: false, reason: 'TARGET_TOO_SHORT' });
  });

  it('잘못된 기준 길이·좌표·사진 크기 거부', () => {
    const t = { targetPoints: [{ x: 0.1, y: 0.5 }, { x: 0.6, y: 0.5 }] as [{ x: number; y: number }, { x: number; y: number }] };
    expect(measureFromPhoto({ ...base, ...t, referenceMm: 0 })).toEqual({ ok: false, reason: 'BAD_REFERENCE_LENGTH' });
    expect(measureFromPhoto({ ...base, ...t, referenceMm: Number.NaN })).toEqual({ ok: false, reason: 'BAD_REFERENCE_LENGTH' });
    expect(measureFromPhoto({ ...base, ...t, imageWidth: 0 })).toEqual({ ok: false, reason: 'BAD_IMAGE' });
    expect(measureFromPhoto({ ...base, targetPoints: [{ x: -0.1, y: 0.5 }, { x: 0.6, y: 0.5 }] })).toEqual({ ok: false, reason: 'BAD_POINT' });
  });

  it('기준보다 훨씬 긴 길이(외삽)·작은 기준선은 경고', () => {
    const small = { ...base, referencePoints: [{ x: 0.1, y: 0.9 }, { x: 0.15, y: 0.9 }] as typeof base.referencePoints, referenceMm: 50 };
    const r = measureFromPhoto({ ...small, targetPoints: [{ x: 0, y: 0.5 }, { x: 1, y: 0.5 }] });
    expect(r.ok && r.warnings).toEqual(['EXTRAPOLATED', 'TINY_REFERENCE_SHARE']);
  });

  it('저장 기록에 계산 근거를 남긴다', () => {
    const input = { ...base, targetPoints: [{ x: 0.1, y: 0.5 }, { x: 0.65, y: 0.5 }] as typeof base.referencePoints, photoId: 'ph1', referenceLabel: '줄자 30cm' };
    const c = toCalibration(input, 550, new Date('2026-11-14T00:00:00Z'));
    expect(c).toMatchObject({ photoId: 'ph1', referenceMm: 300, computedMm: 550, perspectiveCorrected: false, method: 'KNOWN_LENGTH_LINE' });
  });
});

describe('화면 좌표 → 사진 정규화 좌표(object-fit: contain)', () => {
  // 400×400 상자에 1000×500 사진 → 400×200으로 그려지고 위아래 100px 여백
  const box = { left: 0, top: 0, width: 400, height: 400 };
  it('그려진 사진 안쪽은 0~1로 변환', () => {
    expect(screenToNorm(200, 200, box, 1000, 500)).toEqual({ x: 0.5, y: 0.5 });
    expect(screenToNorm(0, 100, box, 1000, 500)).toEqual({ x: 0, y: 0 });
  });
  it('여백(사진 바깥)을 누르면 null', () => {
    expect(screenToNorm(200, 50, box, 1000, 500)).toBeNull();
  });
});

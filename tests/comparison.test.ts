import { describe, expect, it } from 'vitest';
import { compare, compareCandidates } from '../src/domain/comparison';
import { NOW, measurement, product } from './fixtures';

const axis = (r: ReturnType<typeof compare>, a: string) => r.axes.find((x) => x.axis === a)!;

describe('비교 엔진 FIT / OVER / REVIEW', () => {
  it('모든 치수·여유가 확인되고 통과하면 FIT', () => {
    const r = compare(measurement(), product(), NOW);
    expect(r.status).toBe('FIT');
    expect(axis(r, 'width')).toMatchObject({ requiredMm: 920, marginMm: 0, status: 'FIT' }); // 900+10+10, 공간과 같음 → 충족
    expect(axis(r, 'depth').marginMm).toBe(0); // 700+50
    expect(axis(r, 'height').marginMm).toBe(0); // 1800+50
    expect(r.cautions).toEqual([]);
  });

  it('제품이 1mm라도 크면 OVER', () => {
    const r = compare(measurement(), product({ size: { width: 901, depth: 700, height: 1800 } }), NOW);
    expect(r.status).toBe('OVER');
    expect(axis(r, 'width')).toMatchObject({ status: 'OVER', marginMm: -1 });
  });

  it('공간 치수 누락 → REVIEW', () => {
    const r = compare(measurement({ height: null }), product(), NOW);
    expect(r.status).toBe('REVIEW');
    expect(axis(r, 'height').reasons).toEqual(['SPACE_MISSING']);
  });

  it('제품 치수 누락 → REVIEW', () => {
    const r = compare(measurement(), product({ size: { width: 900, depth: null, height: 1800 } }), NOW);
    expect(r.status).toBe('REVIEW');
    expect(axis(r, 'depth').reasons).toContain('PRODUCT_MISSING');
  });

  it('설치 여유 미입력은 0으로 채우지 않고 REVIEW', () => {
    const r = compare(measurement(), product({ clearance: { left: null, right: 10, rear: 50, top: 50 } }), NOW);
    expect(r.status).toBe('REVIEW');
    expect(axis(r, 'width')).toMatchObject({ status: 'REVIEW', unknownClearances: ['left'], requiredMm: 910 });
  });

  it('설치 여유 0을 사용자가 확인했으면 FIT 가능', () => {
    const r = compare(measurement(), product({ clearance: { left: 0, right: 0, rear: 0, top: 0 } }), NOW);
    expect(r.status).toBe('FIT');
    expect(axis(r, 'width').marginMm).toBe(20);
  });

  it('확정 초과와 미확인이 함께 있으면 OVER이고 미확인 축도 함께 남는다', () => {
    const r = compare(measurement({ height: null }), product({ size: { width: 1000, depth: 700, height: 1800 } }), NOW);
    expect(r.status).toBe('OVER');
    expect(axis(r, 'width').status).toBe('OVER');
    expect(axis(r, 'height').status).toBe('REVIEW');
  });

  it('미확인 여유가 있어도 확인된 값만으로 넘치면 OVER', () => {
    const r = compare(measurement(), product({ size: { width: 930, depth: 700, height: 1800 }, clearance: { left: null, right: null, rear: 50, top: 50 } }), NOW);
    expect(axis(r, 'width').status).toBe('OVER');
  });

  it('문 개방 공간: 제품 요구를 모르면 REVIEW, 공간보다 크면 OVER, 0이면 생략', () => {
    expect(axis(compare(measurement(), product({ doorOpenMm: null }), NOW), 'frontSpace').status).toBe('REVIEW');
    expect(axis(compare(measurement(), product({ doorOpenMm: 1200 }), NOW), 'frontSpace').status).toBe('OVER');
    expect(compare(measurement(), product({ doorOpenMm: 0 }), NOW).axes.some((a) => a.axis === 'frontSpace')).toBe(false);
    expect(axis(compare(measurement({ frontSpace: null }), product({ doorOpenMm: 600 }), NOW), 'frontSpace').reasons).toEqual(['SPACE_MISSING']);
  });

  it('사진 참고값·출처 미확인·오래된 측정은 주의 표시', () => {
    const r = compare(
      measurement({ width: { mm: 920, origin: 'PHOTO' }, depth: { mm: 750, origin: 'UNKNOWN' }, measuredOn: '2024-01-01' }),
      product(),
      NOW,
    );
    expect(r.status).toBe('FIT'); // 판정은 값 기준, 주의는 따로
    expect(r.cautions).toEqual(['PHOTO_VALUE_USED', 'UNKNOWN_ORIGIN_USED', 'STALE_MEASUREMENT']);
    expect(compare(measurement({ measuredOn: null }), product(), NOW).cautions).toContain('NO_MEASURED_DATE');
  });

  it('후보는 최대 3개까지', () => {
    const list = compareCandidates(measurement(), [product({ id: 'a' }), product({ id: 'b' }), product({ id: 'c' }), product({ id: 'd' })], NOW);
    expect(list.map((x) => x.product.id)).toEqual(['a', 'b', 'c']);
  });
});

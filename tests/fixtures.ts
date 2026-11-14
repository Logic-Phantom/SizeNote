// 테스트 전용 샘플(실사용 데이터처럼 화면에 노출하지 않는다).
import type { Measurement, Product } from '../src/domain/types';

export const NOW = new Date('2026-11-14T09:00:00+09:00');

export function measurement(over: Partial<Measurement> = {}): Measurement {
  return {
    id: 'm1',
    spaceId: 's1',
    name: '냉장고 자리',
    kind: 'FRIDGE_SPOT',
    width: { mm: 920, origin: 'DIRECT' },
    depth: { mm: 750, origin: 'DIRECT' },
    height: { mm: 1850, origin: 'DIRECT' },
    frontSpace: { mm: 1000, origin: 'DIRECT' },
    measuredOn: '2026-11-08',
    photoIds: [],
    note: '',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...over,
  };
}

export function product(over: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: '양문형 냉장고',
    category: 'FRIDGE',
    maker: '',
    model: '',
    size: { width: 900, depth: 700, height: 1800 },
    packageSize: null,
    clearance: { left: 10, right: 10, rear: 50, top: 50 },
    doorOpenMm: 0,
    source: 'MANUAL_DOC',
    sourceUrl: '',
    note: '',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...over,
  };
}

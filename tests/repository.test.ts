import { describe, expect, it } from 'vitest';
import { deleteSpace, duplicateMeasurement, recordComparison, upsertMeasurement, upsertProduct, upsertSpace } from '../src/domain/records';
import { emptyState, LIMITS, type AppState } from '../src/domain/types';
import { memoryStore } from '../src/storage/kv';
import { KEYS, loadState, normalizeState, removePhotos, saveState, savePhoto, wipeAll } from '../src/storage/repository';
import { NOW, measurement, product } from './fixtures';

function seeded(): AppState {
  let s = emptyState();
  s = upsertSpace(s, { id: 's1', name: '주방', category: 'KITCHEN', note: '', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }, NOW);
  s = upsertMeasurement(s, measurement({ photoIds: ['ph1'] }), NOW).state;
  s = upsertProduct(s, product(), NOW);
  return s;
}

describe('저장·불러오기', () => {
  it('저장한 상태를 그대로 다시 읽는다', async () => {
    const kv = memoryStore();
    const s = seeded();
    await saveState(kv, s);
    const r = await loadState(kv);
    expect(r.corrupted).toBe(false);
    expect(r.state).toEqual(s);
  });

  it('JSON이 깨졌으면 빈 상태로 시작하고 원본은 백업 키에 남긴다', async () => {
    const kv = memoryStore();
    await kv.set(KEYS.state, '{oops');
    const r = await loadState(kv);
    expect(r).toEqual({ state: emptyState(), corrupted: true });
    expect(await kv.get(`${KEYS.state}.corrupted`)).toBe('{oops');
  });

  it('모르는 스키마 버전은 손상으로 처리', async () => {
    const kv = memoryStore();
    await kv.set(KEYS.state, JSON.stringify({ schemaVersion: 99 }));
    expect((await loadState(kv)).corrupted).toBe(true);
  });

  it('이상한 값은 버리고 고아 측정 항목은 정리한다', () => {
    const raw = {
      ...seeded(),
      measurements: [
        measurement({ width: { mm: -5, origin: 'DIRECT' } as never }),
        measurement({ id: 'orphan', spaceId: 'gone' }),
        { junk: true },
      ],
      products: [product({ clearance: { left: 0, right: Number.NaN, rear: 50, top: 50 } as never })],
    };
    const s = normalizeState(JSON.parse(JSON.stringify(raw)));
    expect(s.measurements.map((m) => m.id)).toEqual(['m1']);
    expect(s.measurements[0].width).toBeNull();
    expect(s.products[0].clearance).toEqual({ left: 0, right: null, rear: 50, top: 50 });
  });
});

describe('상태 변경과 사진 정합성', () => {
  it('공간 삭제 시 측정 항목과 사진 키를 함께 정리하고 비교 기록은 남긴다', () => {
    const withCmp = recordComparison(seeded(), 'm1', 'p1', null, NOW)!.state;
    const change = deleteSpace(withCmp, 's1');
    expect(change.state.measurements).toEqual([]);
    expect(change.dropPhotos).toEqual(['ph1']);
    expect(change.state.comparisons).toHaveLength(1);
  });

  it('측정 항목에서 뺀 사진만 지운다', () => {
    const s = seeded();
    const m = s.measurements[0];
    const change = upsertMeasurement(s, { ...m, photoIds: [] }, NOW);
    expect(change.dropPhotos).toEqual(['ph1']);
  });

  it('복제는 사진을 복사하지 않는다', () => {
    const change = duplicateMeasurement(seeded(), 'm1', NOW);
    const copy = change.state.measurements.find((m) => m.id !== 'm1')!;
    expect(copy.name).toBe('냉장고 자리 복사본');
    expect(copy.photoIds).toEqual([]);
  });

  it('전체 삭제는 이 앱 키만 지운다', async () => {
    const kv = memoryStore();
    const s = seeded();
    await saveState(kv, s);
    await savePhoto(kv, 'ph1', 'data:image/jpeg;base64,AAAA');
    await kv.set('other-app.key', 'keep');
    await wipeAll(kv, s);
    expect(await kv.get(KEYS.state)).toBeNull();
    expect(await kv.get(KEYS.photo('ph1'))).toBeNull();
    expect(await kv.get('other-app.key')).toBe('keep');
    await removePhotos(kv, ['none']); // 없는 키 삭제도 안전
  });
});

describe('비교 기록 스냅샷', () => {
  it('이후 제품·공간 치수를 고쳐도 과거 결과는 그대로', () => {
    let s = recordComparison(seeded(), 'm1', 'p1', null, NOW)!.state;
    const before = structuredClone(s.comparisons[0]);
    s = upsertProduct(s, { ...s.products[0], size: { width: 2000, depth: 700, height: 1800 } }, NOW);
    s = upsertMeasurement(s, { ...s.measurements[0], width: { mm: 500, origin: 'DIRECT' } }, NOW).state;
    expect(s.comparisons[0]).toEqual(before);
    expect(before.result.status).toBe('FIT');
  });

  it('최근 기록은 최대 개수까지만 보관', () => {
    let s = seeded();
    for (let i = 0; i < LIMITS.comparisons + 5; i++) s = recordComparison(s, 'm1', 'p1', null, NOW)!.state;
    expect(s.comparisons).toHaveLength(LIMITS.comparisons);
  });

  it('삭제된 대상과는 비교하지 않는다', () => {
    expect(recordComparison(seeded(), 'nope', 'p1', null, NOW)).toBeNull();
  });
});

describe('반입 경로 구간', () => {
  it('추가·수정·삭제와 한도', async () => {
    const { upsertPassage, deletePassage, LimitError } = await import('../src/domain/records');
    const seg = { id: 'g1', name: '현관문', kind: 'FRONT_DOOR' as const, widthMm: 900, heightMm: 2000, depthMm: null, turning: false, note: '', updatedAt: '' };
    let s = upsertPassage(emptyState(), seg, NOW);
    s = upsertPassage(s, { ...seg, widthMm: 850 }, NOW);
    expect(s.passages).toHaveLength(1);
    expect(s.passages[0].widthMm).toBe(850);
    expect(deletePassage(s, 'g1').passages).toEqual([]);
    for (let i = 2; i <= LIMITS.passages; i++) s = upsertPassage(s, { ...seg, id: `g${i}` }, NOW);
    expect(() => upsertPassage(s, { ...seg, id: 'over' }, NOW)).toThrow(LimitError);
  });
});

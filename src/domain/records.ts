// 상태 변경 함수(순수). 화면은 store.commit(fn)으로만 상태를 바꾼다.
// 사진 키 삭제가 필요한 변경은 Change.dropPhotos로 돌려줘 저장 성공 후에만 지운다(사진·메타데이터 정합성).
import { compare } from './comparison';
import type { PassageResult } from './passage';
import { LIMITS, type AppState, type ComparisonRecord, type Measurement, type PassageSegment, type Product, type Space } from './types';

export interface Change {
  state: AppState;
  dropPhotos: string[];
}

export function newId(prefix: string, now: Date = new Date()): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${now.getTime().toString(36)}${rand}`;
}

const touch = <T extends { updatedAt: string }>(v: T, now: Date): T => ({ ...v, updatedAt: now.toISOString() });

// ── 공간 ────────────────────────────────────────────────

export function upsertSpace(s: AppState, space: Space, now: Date = new Date()): AppState {
  const exists = s.spaces.some((x) => x.id === space.id);
  if (!exists && s.spaces.length >= LIMITS.spaces) throw new LimitError('spaces');
  const next = touch(space, now);
  return { ...s, spaces: exists ? s.spaces.map((x) => (x.id === space.id ? next : x)) : [...s.spaces, next] };
}

/** 공간 삭제: 소속 측정 대상과 사진도 함께 지운다. 비교 기록은 스냅샷이라 남긴다 */
export function deleteSpace(s: AppState, spaceId: string): Change {
  const gone = s.measurements.filter((m) => m.spaceId === spaceId);
  return {
    state: { ...s, spaces: s.spaces.filter((x) => x.id !== spaceId), measurements: s.measurements.filter((m) => m.spaceId !== spaceId) },
    dropPhotos: gone.flatMap((m) => m.photoIds),
  };
}

// ── 측정 대상 ───────────────────────────────────────────

export function upsertMeasurement(s: AppState, m: Measurement, now: Date = new Date()): Change {
  const prev = s.measurements.find((x) => x.id === m.id);
  if (!prev && s.measurements.filter((x) => x.spaceId === m.spaceId).length >= LIMITS.measurementsPerSpace) throw new LimitError('measurements');
  const next = touch({ ...m, photoIds: m.photoIds.slice(0, LIMITS.photosPerMeasurement) }, now);
  const dropPhotos = prev ? prev.photoIds.filter((id) => !next.photoIds.includes(id)) : [];
  return {
    state: {
      ...s,
      measurements: prev ? s.measurements.map((x) => (x.id === m.id ? next : x)) : [...s.measurements, next],
      spaces: s.spaces.map((sp) => (sp.id === m.spaceId ? touch(sp, now) : sp)),
    },
    dropPhotos,
  };
}

export function deleteMeasurement(s: AppState, id: string): Change {
  const m = s.measurements.find((x) => x.id === id);
  return { state: { ...s, measurements: s.measurements.filter((x) => x.id !== id) }, dropPhotos: m?.photoIds ?? [] };
}

/** 측정 대상 복제(재사용). 사진은 복사하지 않는다(용량·삭제 정합성) */
export function duplicateMeasurement(s: AppState, id: string, now: Date = new Date()): Change {
  const m = s.measurements.find((x) => x.id === id);
  if (!m) return { state: s, dropPhotos: [] };
  const copy: Measurement = { ...m, id: newId('m', now), name: `${m.name} 복사본`.slice(0, LIMITS.name), photoIds: [], createdAt: now.toISOString(), updatedAt: now.toISOString() };
  return upsertMeasurement(s, copy, now);
}

// ── 제품 ────────────────────────────────────────────────

export function upsertProduct(s: AppState, p: Product, now: Date = new Date()): AppState {
  const exists = s.products.some((x) => x.id === p.id);
  if (!exists && s.products.length >= LIMITS.products) throw new LimitError('products');
  const next = touch(p, now);
  return { ...s, products: exists ? s.products.map((x) => (x.id === p.id ? next : x)) : [...s.products, next] };
}

export function deleteProduct(s: AppState, id: string): AppState {
  return { ...s, products: s.products.filter((x) => x.id !== id) };
}

// ── 반입 경로 ───────────────────────────────────────────

export function upsertPassage(s: AppState, seg: PassageSegment, now: Date = new Date()): AppState {
  const exists = s.passages.some((x) => x.id === seg.id);
  if (!exists && s.passages.length >= LIMITS.passages) throw new LimitError('passages');
  const next = touch(seg, now);
  return { ...s, passages: exists ? s.passages.map((x) => (x.id === seg.id ? next : x)) : [...s.passages, next] };
}

export function deletePassage(s: AppState, id: string): AppState {
  return { ...s, passages: s.passages.filter((x) => x.id !== id) };
}

// ── 비교 기록 ───────────────────────────────────────────

/** 비교를 실행하고 당시 값을 복사해 기록한다(최신이 앞, 최대 LIMITS.comparisons개) */
export function recordComparison(
  s: AppState,
  measurementId: string,
  productId: string,
  passage: PassageResult | null,
  now: Date = new Date(),
): { state: AppState; record: ComparisonRecord } | null {
  const m = s.measurements.find((x) => x.id === measurementId);
  const p = s.products.find((x) => x.id === productId);
  const space = m && s.spaces.find((x) => x.id === m.spaceId);
  if (!m || !p || !space) return null;
  const record: ComparisonRecord = {
    id: newId('c', now),
    comparedAt: now.toISOString(),
    spaceName: space.name,
    measurement: structuredClone(m),
    product: structuredClone(p),
    result: compare(m, p, now),
    passage,
  };
  return { state: { ...s, comparisons: [record, ...s.comparisons].slice(0, LIMITS.comparisons) }, record };
}

export function deleteComparison(s: AppState, id: string): AppState {
  return { ...s, comparisons: s.comparisons.filter((c) => c.id !== id) };
}

export class LimitError extends Error {
  readonly what: 'spaces' | 'measurements' | 'products' | 'passages';
  constructor(what: 'spaces' | 'measurements' | 'products' | 'passages') {
    super(`limit:${what}`);
    this.what = what;
  }
}

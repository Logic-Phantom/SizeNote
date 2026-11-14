// 앱 상태 JSON과 사진을 저장소에 읽고 쓴다. 이 앱이 만든 키(sizenote.*)만 건드린다(clearItems 사용 금지).
// 사진(data URI)은 상태 JSON에 넣지 않고 사진마다 별도 키에 둔다.
import type { ComparisonResult } from '../domain/comparison';
import type { PassageResult } from '../domain/passage';
import {
  LIMITS,
  SCHEMA_VERSION,
  emptyState,
  type AppState,
  type Clearance,
  type ComparisonRecord,
  type Dims,
  type MeasuredValue,
  type Measurement,
  type NormPoint,
  type PassageKind,
  type PassageSegment,
  type PhotoCalibration,
  type Product,
  type ProductCategory,
  type Space,
  type SpaceCategory,
  type SpecSource,
  type TargetKind,
  type ValueOrigin,
} from '../domain/types';
import { CLEARANCE_MAX_MM, sanitizeMm } from '../domain/units';
import type { KeyValueStore } from './kv';

export const KEYS = {
  state: 'sizenote.state.v1',
  photo: (id: string) => `sizenote.photo.${id}.v1`,
} as const;

export interface LoadResult {
  state: AppState;
  /** 저장된 값이 손상돼 읽지 못함(빈 상태로 시작, 원본은 백업 키에 보존) */
  corrupted: boolean;
}

export async function loadState(kv: KeyValueStore): Promise<LoadResult> {
  const raw = await kv.get(KEYS.state);
  if (!raw) return { state: emptyState(), corrupted: false };
  try {
    return { state: normalizeState(migrate(JSON.parse(raw))), corrupted: false };
  } catch {
    // 덮어쓰기 전에 원본을 남겨 둔다(복구 여지). 실패해도 앱은 계속 뜬다
    try {
      await kv.set(`${KEYS.state}.corrupted`, raw);
    } catch {
      /* 무시 */
    }
    return { state: emptyState(), corrupted: true };
  }
}

export async function saveState(kv: KeyValueStore, state: AppState): Promise<void> {
  await kv.set(KEYS.state, JSON.stringify(state));
}

export async function loadPhoto(kv: KeyValueStore, id: string): Promise<string | null> {
  const v = await kv.get(KEYS.photo(id));
  return v && v.startsWith('data:image/') ? v : null;
}

export async function savePhoto(kv: KeyValueStore, id: string, dataUri: string): Promise<void> {
  await kv.set(KEYS.photo(id), dataUri);
}

export async function removePhotos(kv: KeyValueStore, ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => kv.remove(KEYS.photo(id))));
}

/** 모든 데이터 삭제: 상태 키와 측정 대상에 연결된 사진 키만 지운다 */
export async function wipeAll(kv: KeyValueStore, state: AppState): Promise<void> {
  await removePhotos(kv, state.measurements.flatMap((m) => m.photoIds));
  await kv.remove(KEYS.state);
  await kv.remove(`${KEYS.state}.corrupted`);
}

/** 스키마 버전 올릴 때 여기서 단계별로 변환한다. 지금은 v1뿐 */
export function migrate(v: unknown): unknown {
  if (isObj(v) && v.schemaVersion === SCHEMA_VERSION) return v;
  throw new Error('unsupported schema');
}

// ── 방어적 파싱: 알 수 없는 값은 버리고 앱이 멈추지 않게 한다 ─────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const iso = (v: unknown) => (typeof v === 'string' && Number.isFinite(Date.parse(v)) ? v : null);
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const EPOCH = new Date(0).toISOString();

const SPACE_CATS: readonly SpaceCategory[] = ['LIVING', 'KITCHEN', 'BEDROOM', 'LAUNDRY', 'BATHROOM', 'ENTRANCE', 'BALCONY', 'OTHER'];
const TARGET_KINDS: readonly TargetKind[] = ['FRIDGE_SPOT', 'WASHER_SPOT', 'DRYER_SPOT', 'DISHWASHER_SPOT', 'TV_SPOT', 'SOFA_SPOT', 'BED_SPOT', 'DESK_SPOT', 'WARDROBE_SPOT', 'WINDOW', 'OTHER'];
const PRODUCT_CATS: readonly ProductCategory[] = ['FRIDGE', 'WASHER', 'DRYER', 'DISHWASHER', 'TV', 'BED', 'SOFA', 'DESK', 'WARDROBE', 'CURTAIN', 'OTHER'];
const SPEC_SOURCES: readonly SpecSource[] = ['MANUAL_DOC', 'MAKER_SITE', 'SELLER_PAGE', 'DIRECT', 'OTHER'];
const ORIGINS: readonly ValueOrigin[] = ['DIRECT', 'PHOTO', 'DOCUMENT', 'UNKNOWN'];
const PASSAGE_KINDS: readonly PassageKind[] = ['BUILDING_ENTRANCE', 'ELEVATOR', 'HALLWAY', 'FRONT_DOOR', 'ROOM_DOOR', 'STAIRS', 'OTHER'];

function point(v: unknown): NormPoint | null {
  if (!isObj(v)) return null;
  const { x, y } = v;
  return typeof x === 'number' && typeof y === 'number' && x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : null;
}

function pair(v: unknown): [NormPoint, NormPoint] | null {
  const a = arr(v).map(point);
  return a.length === 2 && a[0] && a[1] ? [a[0], a[1]] : null;
}

function calibration(v: unknown): PhotoCalibration | null {
  if (!isObj(v)) return null;
  const referencePoints = pair(v.referencePoints);
  const targetPoints = pair(v.targetPoints);
  const referenceMm = sanitizeMm(v.referenceMm);
  const computedMm = sanitizeMm(v.computedMm);
  const w = typeof v.imageWidth === 'number' && v.imageWidth > 0 ? v.imageWidth : null;
  const h = typeof v.imageHeight === 'number' && v.imageHeight > 0 ? v.imageHeight : null;
  const photoId = str(v.photoId, 64);
  if (!referencePoints || !targetPoints || referenceMm == null || computedMm == null || !w || !h || !photoId) return null;
  return {
    photoId,
    imageWidth: w,
    imageHeight: h,
    method: 'KNOWN_LENGTH_LINE',
    referenceLabel: str(v.referenceLabel, LIMITS.name),
    referenceMm,
    referencePoints,
    targetPoints,
    computedMm,
    perspectiveCorrected: false,
    algorithmVersion: str(v.algorithmVersion, 32),
    measuredAt: iso(v.measuredAt) ?? EPOCH,
  };
}

function measured(v: unknown): MeasuredValue | null {
  if (!isObj(v)) return null;
  const mm = sanitizeMm(v.mm);
  if (mm == null) return null;
  const photo = calibration(v.photo);
  const origin = oneOf(v.origin, ORIGINS, 'UNKNOWN');
  return photo ? { mm, origin, photo } : { mm, origin };
}

function dims(v: unknown): Dims | null {
  if (!isObj(v)) return null;
  return { width: sanitizeMm(v.width), depth: sanitizeMm(v.depth), height: sanitizeMm(v.height) };
}

function clearance(v: unknown): Clearance {
  const o = isObj(v) ? v : {};
  const c = (x: unknown) => sanitizeMm(x, { allowZero: true, maxMm: CLEARANCE_MAX_MM });
  return { left: c(o.left), right: c(o.right), rear: c(o.rear), top: c(o.top) };
}

function space(v: unknown): Space | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const name = str(v.name, LIMITS.name);
  if (!id || !name) return null;
  return { id, name, category: oneOf(v.category, SPACE_CATS, 'OTHER'), note: str(v.note, LIMITS.note), createdAt: iso(v.createdAt) ?? EPOCH, updatedAt: iso(v.updatedAt) ?? EPOCH };
}

export function measurement(v: unknown): Measurement | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const spaceId = str(v.spaceId, 64);
  const name = str(v.name, LIMITS.name);
  if (!id || !spaceId || !name) return null;
  return {
    id,
    spaceId,
    name,
    kind: oneOf(v.kind, TARGET_KINDS, 'OTHER'),
    width: measured(v.width),
    depth: measured(v.depth),
    height: measured(v.height),
    frontSpace: measured(v.frontSpace),
    measuredOn: day(v.measuredOn),
    photoIds: arr(v.photoIds)
      .filter((x): x is string => typeof x === 'string' && x.length > 0 && x.length <= 64)
      .slice(0, LIMITS.photosPerMeasurement),
    note: str(v.note, LIMITS.note),
    createdAt: iso(v.createdAt) ?? EPOCH,
    updatedAt: iso(v.updatedAt) ?? EPOCH,
  };
}

export function product(v: unknown): Product | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const name = str(v.name, LIMITS.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    category: oneOf(v.category, PRODUCT_CATS, 'OTHER'),
    maker: str(v.maker, LIMITS.name),
    model: str(v.model, LIMITS.name),
    size: dims(v.size) ?? { width: null, depth: null, height: null },
    packageSize: dims(v.packageSize),
    clearance: clearance(v.clearance),
    doorOpenMm: sanitizeMm(v.doorOpenMm, { allowZero: true, maxMm: CLEARANCE_MAX_MM }),
    source: oneOf(v.source, SPEC_SOURCES, 'OTHER'),
    sourceUrl: str(v.sourceUrl, LIMITS.url),
    note: str(v.note, LIMITS.note),
    createdAt: iso(v.createdAt) ?? EPOCH,
    updatedAt: iso(v.updatedAt) ?? EPOCH,
  };
}

function passage(v: unknown): PassageSegment | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const name = str(v.name, LIMITS.name);
  if (!id || !name) return null;
  return {
    id,
    name,
    kind: oneOf(v.kind, PASSAGE_KINDS, 'OTHER'),
    widthMm: sanitizeMm(v.widthMm),
    heightMm: sanitizeMm(v.heightMm),
    depthMm: sanitizeMm(v.depthMm),
    turning: typeof v.turning === 'boolean' ? v.turning : null,
    note: str(v.note, LIMITS.note),
    updatedAt: iso(v.updatedAt) ?? EPOCH,
  };
}

/** 비교 기록은 당시 계산 결과를 그대로 보여 줘야 하므로 다시 계산하지 않는다. 형태가 깨진 기록만 버린다 */
function comparison(v: unknown): ComparisonRecord | null {
  if (!isObj(v)) return null;
  const id = str(v.id, 64);
  const comparedAt = iso(v.comparedAt);
  const m = measurement(v.measurement);
  const p = product(v.product);
  const r = v.result;
  if (!id || !comparedAt || !m || !p || !isObj(r) || !['FIT', 'OVER', 'REVIEW'].includes(r.status as string) || !Array.isArray(r.axes)) return null;
  const ps = v.passage;
  return {
    id,
    comparedAt,
    spaceName: str(v.spaceName, LIMITS.name),
    measurement: m,
    product: p,
    result: r as unknown as ComparisonResult,
    passage: isObj(ps) && Array.isArray(ps.segments) ? (ps as unknown as PassageResult) : null,
  };
}

const keep = <T,>(list: unknown[], fn: (v: unknown) => T | null, max: number): T[] =>
  list
    .map(fn)
    .filter((x): x is T => x != null)
    .slice(0, max);

export function normalizeState(v: unknown): AppState {
  if (!isObj(v) || v.schemaVersion !== SCHEMA_VERSION) throw new Error('unsupported schema');
  const spaces = keep(arr(v.spaces), space, LIMITS.spaces);
  const spaceIds = new Set(spaces.map((s) => s.id));
  // 공간이 사라진 측정 대상(고아)은 버린다
  const measurements = keep(arr(v.measurements), measurement, LIMITS.spaces * LIMITS.measurementsPerSpace).filter((m) => spaceIds.has(m.spaceId));
  return {
    schemaVersion: SCHEMA_VERSION,
    onboarded: v.onboarded === true,
    storageNoticeSeen: v.storageNoticeSeen === true,
    displayUnit: v.displayUnit === 'mm' ? 'mm' : 'cm',
    spaces,
    measurements,
    products: keep(arr(v.products), product, LIMITS.products),
    passages: keep(arr(v.passages), passage, LIMITS.passages),
    comparisons: keep(arr(v.comparisons), comparison, LIMITS.comparisons),
  };
}

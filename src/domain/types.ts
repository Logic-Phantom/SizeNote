// 도메인 타입. 순수 TS(DOM·SDK 의존 금지). 저장 스키마와 1:1이며 바꾸면 SCHEMA_VERSION과 마이그레이션을 같이 고친다.
// 길이는 전부 정수 mm. null = 아직 모름(0으로 대신하지 않는다).

export const SCHEMA_VERSION = 1;

export const LIMITS = {
  spaces: 30,
  measurementsPerSpace: 30,
  products: 50,
  passages: 15,
  comparisons: 20, // 최근 비교 기록. Storage 용량 POC 후 조정
  photosPerMeasurement: 3,
  name: 40,
  note: 300,
  url: 500,
} as const;

// ── 치수 값과 출처 ───────────────────────────────────────

/**
 * 값 하나의 출처(신뢰 수준 순서가 아니다 — PHOTO를 DIRECT보다 높게 표시하지 않는다).
 * DIRECT: 줄자·레이저로 직접 잼 / PHOTO: 사진 위 기준 길이로 계산한 참고값 /
 * DOCUMENT: 도면·설명서·제조사 문서 / UNKNOWN: 출처 미확인
 */
export type ValueOrigin = 'DIRECT' | 'PHOTO' | 'DOCUMENT' | 'UNKNOWN';

/** 사진 위 좌표. 저장한 사진 기준 0~1 비율(화면 크기·확대와 무관하게 다시 그릴 수 있다) */
export interface NormPoint {
  x: number;
  y: number;
}

/** 사진 보조 측정 기록: 무엇을 기준으로 어떻게 계산했는지 그대로 남긴다(재조정·감사용) */
export interface PhotoCalibration {
  photoId: string;
  imageWidth: number; // 계산에 쓴 사진의 픽셀 크기
  imageHeight: number;
  method: 'KNOWN_LENGTH_LINE'; // 1차: 같은 평면의 기준선 1개. 4점 원근 보정은 미구현
  referenceLabel: string; // 예: 줄자 30cm, A4 긴 변
  referenceMm: number;
  referencePoints: [NormPoint, NormPoint];
  targetPoints: [NormPoint, NormPoint];
  computedMm: number; // 계산 당시 값(사용자가 고쳐도 보존)
  perspectiveCorrected: false;
  algorithmVersion: string;
  measuredAt: string; // ISO
}

export interface MeasuredValue {
  mm: number;
  origin: ValueOrigin;
  /** origin이 PHOTO였거나, 사진 값에서 사용자가 줄자로 확인해 고친 경우 원래 계산 기록 */
  photo?: PhotoCalibration | null;
}

export type DimKey = 'width' | 'depth' | 'height';
export const DIM_KEYS: readonly DimKey[] = ['width', 'depth', 'height'];

export interface Dims {
  width: number | null;
  depth: number | null;
  height: number | null;
}

// ── 공간 / 측정 대상 ────────────────────────────────────

export type SpaceCategory = 'LIVING' | 'KITCHEN' | 'BEDROOM' | 'LAUNDRY' | 'BATHROOM' | 'ENTRANCE' | 'BALCONY' | 'OTHER';

export interface Space {
  id: string;
  name: string;
  category: SpaceCategory;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export type TargetKind =
  | 'FRIDGE_SPOT'
  | 'WASHER_SPOT'
  | 'DRYER_SPOT'
  | 'DISHWASHER_SPOT'
  | 'TV_SPOT'
  | 'SOFA_SPOT'
  | 'BED_SPOT'
  | 'DESK_SPOT'
  | 'WARDROBE_SPOT'
  | 'WINDOW'
  | 'OTHER';

/** 측정 대상(예: 냉장고 자리). 제품과 비교되는 단위 */
export interface Measurement {
  id: string;
  spaceId: string;
  name: string;
  kind: TargetKind;
  width: MeasuredValue | null;
  depth: MeasuredValue | null;
  height: MeasuredValue | null;
  /** 정면 앞쪽으로 비어 있는 거리(문·서랍을 열 공간). 없으면 문 개방 조건은 '추가 확인' */
  frontSpace: MeasuredValue | null;
  measuredOn: string | null; // YYYY-MM-DD
  photoIds: string[];
  note: string;
  createdAt: string;
  updatedAt: string;
}

// ── 제품 ────────────────────────────────────────────────

export type ProductCategory = 'FRIDGE' | 'WASHER' | 'DRYER' | 'DISHWASHER' | 'TV' | 'BED' | 'SOFA' | 'DESK' | 'WARDROBE' | 'CURTAIN' | 'OTHER';

export type SpecSource = 'MANUAL_DOC' | 'MAKER_SITE' | 'SELLER_PAGE' | 'DIRECT' | 'OTHER';

/** 제조사 권장 설치 여유. null = 확인 안 함(0으로 간주하지 않는다), 0 = 필요 없음을 사용자가 확인 */
export interface Clearance {
  left: number | null;
  right: number | null;
  rear: number | null;
  top: number | null;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  maker: string;
  model: string;
  size: Dims; // 본체 외형
  packageSize: Dims | null; // 포장 외형(반입 경로용). 없으면 본체로 대체하지 않는다
  clearance: Clearance;
  /** 문·서랍을 완전히 열 때 정면 앞쪽으로 필요한 거리. null = 확인 안 함, 0 = 필요 없음 확인 */
  doorOpenMm: number | null;
  source: SpecSource;
  sourceUrl: string; // 참고용 기록만(앱이 열거나 수집하지 않음)
  note: string;
  createdAt: string;
  updatedAt: string;
}

// ── 반입 경로 ───────────────────────────────────────────

export type PassageKind = 'BUILDING_ENTRANCE' | 'ELEVATOR' | 'HALLWAY' | 'FRONT_DOOR' | 'ROOM_DOOR' | 'STAIRS' | 'OTHER';

export interface PassageSegment {
  id: string;
  name: string;
  kind: PassageKind;
  widthMm: number | null; // 통과 폭(유효)
  heightMm: number | null; // 통과 높이(유효)
  depthMm: number | null; // 내부 깊이(엘리베이터 등)
  /** 지나가려면 꺾거나 돌려야 하는가. null = 모름 */
  turning: boolean | null;
  note: string;
  updatedAt: string;
}

// ── 비교 기록(스냅샷) ────────────────────────────────────

export type FitStatus = 'FIT' | 'OVER' | 'REVIEW';

/** 비교 당시 값을 복사해 둔다. 이후 공간·제품을 고쳐도 과거 결과는 바뀌지 않는다 */
export interface ComparisonRecord {
  id: string;
  comparedAt: string;
  spaceName: string;
  measurement: Measurement; // 당시 측정 대상 사본
  product: Product; // 당시 제품 사본
  result: import('./comparison').ComparisonResult;
  passage: import('./passage').PassageResult | null;
}

// ── 앱 상태 ─────────────────────────────────────────────

export type DisplayUnit = 'cm' | 'mm';

export interface AppState {
  schemaVersion: typeof SCHEMA_VERSION;
  onboarded: boolean;
  /** 첫 저장 전 '데이터는 이 기기에만 저장돼요' 안내를 봤는지 */
  storageNoticeSeen: boolean;
  displayUnit: DisplayUnit;
  spaces: Space[];
  measurements: Measurement[];
  products: Product[];
  passages: PassageSegment[];
  comparisons: ComparisonRecord[];
}

export function emptyState(): AppState {
  return {
    schemaVersion: SCHEMA_VERSION,
    onboarded: false,
    storageNoticeSeen: false,
    displayUnit: 'cm',
    spaces: [],
    measurements: [],
    products: [],
    passages: [],
    comparisons: [],
  };
}

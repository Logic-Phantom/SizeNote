// 제품 ↔ 측정 대상 비교 엔진(순수 함수). 판정 규칙: docs/DECISIONS.md D-010~D-013, 기획 §5.3~5.4.
// 원칙: 모르는 값은 0으로 채우지 않는다. 확정된 초과만 OVER. 통과해도 '입력값 기준 규격 충족'까지만 말한다.
import type { Clearance, DimKey, FitStatus, MeasuredValue, Measurement, Product, ValueOrigin } from './types';

export const COMPARISON_ALGORITHM_VERSION = 'cmp-1';

/** 측정일이 이보다 오래되면 재측정 권고(데이터는 지우지 않음) */
export const STALE_MEASUREMENT_DAYS = 365;

export type AxisStatus = 'FIT' | 'OVER' | 'REVIEW';

export type ReviewReason =
  | 'SPACE_MISSING' // 공간 치수 없음
  | 'PRODUCT_MISSING' // 제품 치수 없음
  | 'CLEARANCE_UNKNOWN'; // 제조사 설치 여유 미확인

export interface AxisResult {
  axis: DimKey | 'frontSpace';
  status: AxisStatus;
  spaceMm: number | null;
  spaceOrigin: ValueOrigin | null;
  productMm: number | null;
  /** 이 방향에 더한 설치 여유 중 확인된 값의 합 */
  clearanceMm: number;
  /** 확인 안 된 설치 여유 방향 */
  unknownClearances: (keyof Clearance)[];
  /** 제품 + 확인된 여유 */
  requiredMm: number | null;
  /** 공간 - 필요 치수(음수면 초과) */
  marginMm: number | null;
  reasons: ReviewReason[];
}

export type Caution =
  | 'PHOTO_VALUE_USED' // 사진 참고값으로 판정
  | 'UNKNOWN_ORIGIN_USED' // 출처 미확인 값으로 판정
  | 'STALE_MEASUREMENT' // 측정일이 오래됨
  | 'NO_MEASURED_DATE'; // 측정일 없음

export interface ComparisonResult {
  status: FitStatus;
  axes: AxisResult[];
  cautions: Caution[];
  algorithmVersion: string;
}

const CLEARANCE_BY_AXIS: Record<DimKey, (keyof Clearance)[]> = {
  width: ['left', 'right'],
  depth: ['rear'],
  height: ['top'],
};

function compareAxis(
  axis: DimKey | 'frontSpace',
  space: MeasuredValue | null,
  productMm: number | null,
  clearanceKeys: (keyof Clearance)[],
  clearance: Clearance,
): AxisResult {
  const known = clearanceKeys.map((k) => clearance[k]).filter((v): v is number => v != null);
  const unknownClearances = clearanceKeys.filter((k) => clearance[k] == null);
  const clearanceMm = known.reduce((a, b) => a + b, 0);
  const reasons: ReviewReason[] = [];
  if (space == null) reasons.push('SPACE_MISSING');
  if (productMm == null) reasons.push('PRODUCT_MISSING');
  if (unknownClearances.length) reasons.push('CLEARANCE_UNKNOWN');

  const requiredMm = productMm == null ? null : productMm + clearanceMm;
  const marginMm = space != null && requiredMm != null ? space.mm - requiredMm : null;

  // 확인된 값만으로 이미 넘치면 모르는 여유와 무관하게 초과가 확정된다
  let status: AxisStatus;
  if (marginMm != null && marginMm < 0) status = 'OVER';
  else if (reasons.length) status = 'REVIEW';
  else status = 'FIT';

  return {
    axis,
    status,
    spaceMm: space?.mm ?? null,
    spaceOrigin: space?.origin ?? null,
    productMm,
    clearanceMm,
    unknownClearances,
    requiredMm,
    marginMm,
    reasons,
  };
}

/** 문·서랍 개방 공간: 제품이 요구하지 않음(0)을 확인했으면 생략, 모르면 REVIEW */
function compareFrontSpace(m: Measurement, p: Product): AxisResult | null {
  if (p.doorOpenMm === 0) return null;
  return compareAxis('frontSpace', m.frontSpace, p.doorOpenMm, [], { left: 0, right: 0, rear: 0, top: 0 });
}

export function compare(m: Measurement, p: Product, now: Date = new Date()): ComparisonResult {
  const axes: AxisResult[] = (['width', 'depth', 'height'] as const).map((k) =>
    compareAxis(k, m[k], p.size[k], CLEARANCE_BY_AXIS[k], p.clearance),
  );
  const front = compareFrontSpace(m, p);
  if (front) axes.push(front);

  const status: FitStatus = axes.some((a) => a.status === 'OVER') ? 'OVER' : axes.some((a) => a.status === 'REVIEW') ? 'REVIEW' : 'FIT';

  const used = axes.map((a) => a.spaceOrigin).filter((o): o is ValueOrigin => o != null);
  const cautions: Caution[] = [];
  if (used.includes('PHOTO')) cautions.push('PHOTO_VALUE_USED');
  if (used.includes('UNKNOWN')) cautions.push('UNKNOWN_ORIGIN_USED');
  if (!m.measuredOn) cautions.push('NO_MEASURED_DATE');
  else if (isStale(m.measuredOn, now)) cautions.push('STALE_MEASUREMENT');

  return { status, axes, cautions, algorithmVersion: COMPARISON_ALGORITHM_VERSION };
}

export function isStale(measuredOn: string, now: Date): boolean {
  const t = Date.parse(`${measuredOn}T00:00:00`);
  if (!Number.isFinite(t)) return false;
  return now.getTime() - t > STALE_MEASUREMENT_DAYS * 86_400_000;
}

/** 후보 최대 3개를 같은 측정 대상에 대해 비교 */
export const MAX_CANDIDATES = 3;
export function compareCandidates(m: Measurement, products: Product[], now: Date = new Date()): { product: Product; result: ComparisonResult }[] {
  return products.slice(0, MAX_CANDIDATES).map((product) => ({ product, result: compare(m, product, now) }));
}

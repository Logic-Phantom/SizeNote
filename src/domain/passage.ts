// 반입 경로 단순 선별(순수 함수). 3차원 회전·기울이기·코너 통과는 계산하지 않는다(기획 §2.1-F, §5.5).
// 결과는 '통과 규격 충족(단순 비교)' 또는 '추가 확인 필요' 두 가지뿐. 폭이 모자라도 기울이면 들어갈 수 있으므로 '불가'라고 하지 않는다.
import type { Dims, PassageSegment, Product } from './types';

export const PASSAGE_ALGORITHM_VERSION = 'psg-1';

export type PassageBasis = 'BODY' | 'PACKAGE';
/** 통로 폭을 지나가는 제품 면: 가로 면을 앞으로(WIDTH) 또는 옆으로 돌려 깊이 면(DEPTH) */
export type PassageFacing = 'WIDTH' | 'DEPTH';

export type SegmentStatus = 'SIMPLE_PASS' | 'REVIEW';

export type SegmentReason =
  | 'PACKAGE_MISSING' // 포장 치수 미입력(본체로 대체하지 않음)
  | 'PRODUCT_MISSING'
  | 'SEGMENT_MISSING' // 통로 치수 미입력
  | 'WIDTH_SHORT' // 직선 기준 폭 부족
  | 'HEIGHT_SHORT' // 직선 기준 높이 부족
  | 'TURNING_REQUIRED' // 꺾거나 돌려야 함
  | 'TURNING_UNKNOWN' // 꺾임 여부 모름
  | 'STAIRS'; // 계단은 항상 현장 확인

export interface SegmentResult {
  segmentId: string;
  name: string;
  status: SegmentStatus;
  reasons: SegmentReason[];
  passWidthMm: number | null; // 제품 쪽 통과 폭
  passHeightMm: number | null;
  segmentWidthMm: number | null;
  segmentHeightMm: number | null;
}

export interface PassageResult {
  status: SegmentStatus;
  basis: PassageBasis;
  facing: PassageFacing;
  segments: SegmentResult[];
  algorithmVersion: string;
}

export function checkPassage(product: Product, segments: PassageSegment[], basis: PassageBasis, facing: PassageFacing): PassageResult {
  const dims: Dims | null = basis === 'PACKAGE' ? product.packageSize : product.size;
  const passWidth = dims ? (facing === 'WIDTH' ? dims.width : dims.depth) : null;
  const passHeight = dims?.height ?? null;

  const results = segments.map((s): SegmentResult => {
    const reasons: SegmentReason[] = [];
    if (!dims) reasons.push('PACKAGE_MISSING');
    else if (passWidth == null || passHeight == null) reasons.push('PRODUCT_MISSING');
    if (s.widthMm == null || s.heightMm == null) reasons.push('SEGMENT_MISSING');
    if (passWidth != null && s.widthMm != null && passWidth > s.widthMm) reasons.push('WIDTH_SHORT');
    if (passHeight != null && s.heightMm != null && passHeight > s.heightMm) reasons.push('HEIGHT_SHORT');
    if (s.kind === 'STAIRS') reasons.push('STAIRS');
    if (s.turning === true) reasons.push('TURNING_REQUIRED');
    else if (s.turning == null) reasons.push('TURNING_UNKNOWN');
    return {
      segmentId: s.id,
      name: s.name,
      status: reasons.length ? 'REVIEW' : 'SIMPLE_PASS',
      reasons,
      passWidthMm: passWidth,
      passHeightMm: passHeight,
      segmentWidthMm: s.widthMm,
      segmentHeightMm: s.heightMm,
    };
  });

  return {
    status: results.length && results.every((r) => r.status === 'SIMPLE_PASS') ? 'SIMPLE_PASS' : 'REVIEW',
    basis,
    facing,
    segments: results,
    algorithmVersion: PASSAGE_ALGORITHM_VERSION,
  };
}

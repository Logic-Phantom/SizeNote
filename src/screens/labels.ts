// 판정 근거·주의·오류를 화면 문구로 바꾼다(과장 표현 금지: CLAUDE.md).
import type { AxisResult, Caution, ReviewReason } from '../domain/comparison';
import type { SegmentReason } from '../domain/passage';
import type { PhotoMeasureResult, PhotoMeasureWarning } from '../domain/photo-measure';
import type { DimKey } from '../domain/types';
import type { ParseResult } from '../domain/units';

export const DIM_LABEL: Record<DimKey, string> = { width: '가로', depth: '깊이', height: '높이' };

export const AXIS_LABEL: Record<AxisResult['axis'], string> = {
  width: '가로',
  depth: '깊이',
  height: '높이',
  frontSpace: '문 여는 공간',
};

export const REVIEW_REASON_TEXT: Record<ReviewReason, string> = {
  SPACE_MISSING: '공간 치수가 없어요',
  PRODUCT_MISSING: '제품 치수가 없어요',
  CLEARANCE_UNKNOWN: '제조사 설치 여유를 확인하지 않았어요',
};

export const CLEARANCE_TEXT = { left: '왼쪽', right: '오른쪽', rear: '뒤쪽', top: '위쪽' } as const;

export const CAUTION_TEXT: Record<Caution, string> = {
  PHOTO_VALUE_USED: '사진으로 계산한 참고값이 포함돼 있어요. 줄자로 한 번 더 확인해 주세요.',
  UNKNOWN_ORIGIN_USED: '출처를 모르는 치수가 포함돼 있어요.',
  STALE_MEASUREMENT: '측정한 지 1년이 넘었어요. 다시 재 보는 걸 권해요.',
  NO_MEASURED_DATE: '측정 날짜가 없어요.',
};

export const SEGMENT_REASON_TEXT: Record<SegmentReason, string> = {
  PACKAGE_MISSING: '포장 치수를 입력하지 않았어요',
  PRODUCT_MISSING: '제품 치수가 부족해요',
  SEGMENT_MISSING: '통로 폭·높이가 없어요',
  WIDTH_SHORT: '똑바로 들면 폭이 모자라요',
  HEIGHT_SHORT: '똑바로 세우면 높이가 모자라요',
  TURNING_REQUIRED: '꺾거나 돌려야 하는 구간이에요',
  TURNING_UNKNOWN: '꺾임 여부를 확인하지 않았어요',
  STAIRS: '계단은 현장 확인이 필요해요',
};

export function parseError(r: ParseResult, opts: { allowZero?: boolean } = {}): string | null {
  if (r.ok) return null;
  if (r.reason === 'invalid') return '숫자만 입력해 주세요';
  if (r.reason === 'range') return opts.allowZero ? '입력할 수 있는 범위를 넘었어요' : '0보다 크고 너무 크지 않은 값을 입력해 주세요';
  return null;
}

export function photoError(r: Extract<PhotoMeasureResult, { ok: false }>): string {
  switch (r.reason) {
    case 'REFERENCE_TOO_SHORT':
      return '기준선이 너무 짧아요. 기준물을 더 크게 찍거나 확대해서 양 끝을 눌러 주세요.';
    case 'TARGET_TOO_SHORT':
      return '측정할 두 점이 너무 가까워요.';
    case 'BAD_REFERENCE_LENGTH':
      return '기준 길이를 확인해 주세요.';
    case 'OUT_OF_RANGE':
      return '계산 결과가 너무 크거나 작아요. 기준선을 다시 지정해 주세요.';
    default:
      return '사진에서 계산할 수 없어요. 직접 입력해 주세요.';
  }
}

export const PHOTO_WARNING_TEXT: Record<PhotoMeasureWarning, string> = {
  EXTRAPOLATED: '측정 길이가 기준 길이보다 훨씬 길거나 짧아서 오차가 커질 수 있어요.',
  TINY_REFERENCE_SHARE: '기준물이 사진에서 작게 보여 터치 오차가 커질 수 있어요.',
};

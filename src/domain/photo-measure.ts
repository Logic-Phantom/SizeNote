// 사진 보조 측정(수동 보정형, 1차원) 계산. 순수 함수.
// 사용자가 같은 평면에 놓인 기준물(줄자·자·A4 변)의 양 끝과 실제 길이를 지정 → 측정할 두 점의 길이를 비례로 계산한다.
// 원근 왜곡·렌즈 왜곡은 보정하지 않는다(perspectiveCorrected: false). 결과는 항상 '사진 참고값'.
import type { NormPoint, PhotoCalibration } from './types';
import { DIMENSION_MAX_MM, roundHalfUp } from './units';

export const PHOTO_ALGORITHM_VERSION = 'photo-line-1';

/** 기준선이 이보다 짧으면(픽셀) 터치 오차가 너무 커져 계산하지 않는다 */
export const MIN_REFERENCE_PX = 40;
/** 측정선이 이보다 짧으면 같은 점을 두 번 누른 것으로 본다 */
export const MIN_TARGET_PX = 8;
/** 측정 길이가 기준 길이의 이 배수를 넘거나 1/이 배수보다 짧으면 오차 경고 */
export const EXTRAPOLATION_WARN_RATIO = 4;

export interface PhotoMeasureInput {
  imageWidth: number;
  imageHeight: number;
  referencePoints: [NormPoint, NormPoint];
  referenceMm: number;
  targetPoints: [NormPoint, NormPoint];
}

export type PhotoMeasureWarning = 'EXTRAPOLATED' | 'TINY_REFERENCE_SHARE';

export type PhotoMeasureResult =
  | { ok: true; mm: number; mmPerPx: number; referencePx: number; targetPx: number; warnings: PhotoMeasureWarning[] }
  | { ok: false; reason: 'BAD_IMAGE' | 'BAD_POINT' | 'REFERENCE_TOO_SHORT' | 'TARGET_TOO_SHORT' | 'BAD_REFERENCE_LENGTH' | 'OUT_OF_RANGE' };

function validPoint(p: NormPoint): boolean {
  return Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}

/** 정규화 좌표 두 점 사이의 실제 픽셀 거리(가로·세로 비율 반영) */
export function pixelDistance(a: NormPoint, b: NormPoint, w: number, h: number): number {
  return Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);
}

export function measureFromPhoto(input: PhotoMeasureInput): PhotoMeasureResult {
  const { imageWidth: w, imageHeight: h, referencePoints: rp, targetPoints: tp, referenceMm } = input;
  if (!(w > 0 && h > 0 && Number.isFinite(w) && Number.isFinite(h))) return { ok: false, reason: 'BAD_IMAGE' };
  if (![...rp, ...tp].every(validPoint)) return { ok: false, reason: 'BAD_POINT' };
  if (!(Number.isFinite(referenceMm) && referenceMm > 0 && referenceMm <= DIMENSION_MAX_MM)) return { ok: false, reason: 'BAD_REFERENCE_LENGTH' };

  const referencePx = pixelDistance(rp[0], rp[1], w, h);
  const targetPx = pixelDistance(tp[0], tp[1], w, h);
  if (referencePx < MIN_REFERENCE_PX) return { ok: false, reason: 'REFERENCE_TOO_SHORT' };
  if (targetPx < MIN_TARGET_PX) return { ok: false, reason: 'TARGET_TOO_SHORT' };

  const mmPerPx = referenceMm / referencePx;
  const mm = roundHalfUp(targetPx * mmPerPx);
  if (mm < 1 || mm > DIMENSION_MAX_MM) return { ok: false, reason: 'OUT_OF_RANGE' };

  const warnings: PhotoMeasureWarning[] = [];
  const ratio = targetPx / referencePx;
  if (ratio > EXTRAPOLATION_WARN_RATIO || ratio < 1 / EXTRAPOLATION_WARN_RATIO) warnings.push('EXTRAPOLATED');
  // 기준선이 사진 긴 변의 10%도 안 되면 터치 1~2px 오차가 결과를 크게 흔든다
  if (referencePx < Math.max(w, h) * 0.1) warnings.push('TINY_REFERENCE_SHARE');
  return { ok: true, mm, mmPerPx, referencePx, targetPx, warnings };
}

/** 저장용 기록 생성(계산 성공한 경우만) */
export function toCalibration(
  input: PhotoMeasureInput & { photoId: string; referenceLabel: string },
  mm: number,
  now: Date = new Date(),
): PhotoCalibration {
  return {
    photoId: input.photoId,
    imageWidth: input.imageWidth,
    imageHeight: input.imageHeight,
    method: 'KNOWN_LENGTH_LINE',
    referenceLabel: input.referenceLabel,
    referenceMm: input.referenceMm,
    referencePoints: input.referencePoints,
    targetPoints: input.targetPoints,
    computedMm: mm,
    perspectiveCorrected: false,
    algorithmVersion: PHOTO_ALGORITHM_VERSION,
    measuredAt: now.toISOString(),
  };
}

/**
 * 화면에 그려진 사진(object-fit: contain)에서 누른 위치 → 정규화 좌표.
 * 확대/이동 상태는 호출하는 쪽이 boxRect에 반영해 넘긴다. 사진 바깥이면 null.
 */
export function screenToNorm(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
  imageWidth: number,
  imageHeight: number,
): NormPoint | null {
  const scale = Math.min(box.width / imageWidth, box.height / imageHeight);
  const drawnW = imageWidth * scale;
  const drawnH = imageHeight * scale;
  const offX = box.left + (box.width - drawnW) / 2;
  const offY = box.top + (box.height - drawnH) / 2;
  const x = (clientX - offX) / drawnW;
  const y = (clientY - offY) / drawnH;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x, y };
}

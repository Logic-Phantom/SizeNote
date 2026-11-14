// 사진 보조 측정(전체 화면). 기준선 두 점 → 기준 길이 → 측정할 두 점 → 사진 참고값 확인 → 치수에 적용.
// 원근 보정 없음. 결과는 항상 '사진 참고값'이고 줄자 재확인을 안내한다(기획 §18.2).
import { useEffect, useRef, useState } from 'react';
import { measureFromPhoto, screenToNorm, toCalibration } from '../domain/photo-measure';
import type { NormPoint, PhotoCalibration } from '../domain/types';
import { formatLength, parseLength, type Unit } from '../domain/units';
import { DIM_LABEL, PHOTO_WARNING_TEXT, photoError } from '../screens/labels';
import { usePhoto } from '../state/store';
import { ChipGroup, Field, LengthInput } from './forms';
import { Icon } from './Icon';
import { Button, Notice } from './ui';

export type ApplyKey = 'width' | 'depth' | 'height' | 'frontSpace';
const APPLY_OPTIONS: { value: ApplyKey; label: string }[] = [
  { value: 'width', label: DIM_LABEL.width },
  { value: 'depth', label: DIM_LABEL.depth },
  { value: 'height', label: DIM_LABEL.height },
  { value: 'frontSpace', label: '문 여는 공간' },
];

type Preset = 'CUSTOM' | 'A4_LONG' | 'A4_SHORT';
const PRESETS: { value: Preset; label: string; mm: number | null; name: string }[] = [
  { value: 'CUSTOM', label: '줄자·자', mm: null, name: '줄자·자' },
  { value: 'A4_LONG', label: 'A4 긴 변', mm: 297, name: 'A4 용지 긴 변' },
  { value: 'A4_SHORT', label: 'A4 짧은 변', mm: 210, name: 'A4 용지 짧은 변' },
];

type Step = 'ref' | 'target' | 'result';

export function PhotoMeasure({
  photoId,
  unit,
  initialKey,
  onApply,
  onClose,
}: {
  photoId: string;
  unit: Unit;
  initialKey: ApplyKey;
  onApply: (key: ApplyKey, mm: number, calibration: PhotoCalibration) => void;
  onClose: () => void;
}) {
  const uri = usePhoto(photoId);
  const imgRef = useRef<HTMLImageElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [step, setStep] = useState<Step>('ref');
  const [refPts, setRefPts] = useState<NormPoint[]>([]);
  const [tgtPts, setTgtPts] = useState<NormPoint[]>([]);
  const [preset, setPreset] = useState<Preset>('CUSTOM');
  const [refText, setRefText] = useState('');
  const [applyKey, setApplyKey] = useState<ApplyKey>(initialKey);

  // 배경 스크롤 잠금
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const presetMm = PRESETS.find((p) => p.value === preset)!.mm;
  const refParsed = presetMm != null ? ({ ok: true, mm: presetMm } as const) : parseLength(refText, unit);
  const refMm = refParsed.ok ? refParsed.mm : null;

  function onTap(e: React.MouseEvent) {
    const img = imgRef.current;
    if (!img || !size || step === 'result') return;
    const r = img.getBoundingClientRect();
    const p = screenToNorm(e.clientX, e.clientY, { left: r.left, top: r.top, width: r.width, height: r.height }, size.w, size.h);
    if (!p) return;
    const set = step === 'ref' ? setRefPts : setTgtPts;
    set((prev) => (prev.length >= 2 ? [p] : [...prev, p]));
  }

  const calc =
    size && refPts.length === 2 && tgtPts.length === 2 && refMm != null
      ? measureFromPhoto({
          imageWidth: size.w,
          imageHeight: size.h,
          referencePoints: [refPts[0], refPts[1]],
          referenceMm: refMm,
          targetPoints: [tgtPts[0], tgtPts[1]],
        })
      : null;

  function apply() {
    if (!calc?.ok || !size || refMm == null) return;
    const calibration = toCalibration(
      {
        photoId,
        imageWidth: size.w,
        imageHeight: size.h,
        referencePoints: [refPts[0], refPts[1]],
        referenceMm: refMm,
        targetPoints: [tgtPts[0], tgtPts[1]],
        referenceLabel: PRESETS.find((p) => p.value === preset)!.name,
      },
      calc.mm,
    );
    onApply(applyKey, calc.mm, calibration);
  }

  const guide =
    step === 'ref'
      ? refPts.length < 2
        ? `기준물(줄자 눈금·자·A4 용지)의 양 끝을 눌러 주세요 (${refPts.length}/2)`
        : '기준물의 실제 길이를 입력해 주세요'
      : step === 'target'
        ? `측정할 부분의 양 끝을 눌러 주세요 (${tgtPts.length}/2)`
        : '계산된 사진 참고값을 확인해 주세요';

  return (
    <div className="pm" role="dialog" aria-modal="true" aria-label="사진으로 치수 보조 측정">
      <div className="pm-head">
        <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
          <Icon name="x" />
        </button>
        <h2>사진으로 치수 보조 측정</h2>
        <span className="pm-zoom">
          {[1, 2, 3].map((z) => (
            <button key={z} type="button" className={zoom === z ? 'active' : ''} aria-pressed={zoom === z} onClick={() => setZoom(z)}>
              {z}x
            </button>
          ))}
        </span>
      </div>

      <p className="pm-guide" role="status">
        {guide}
      </p>

      <div className="pm-stage">
        {!uri ? (
          <p className="hint pm-empty">사진을 불러오지 못했어요. 직접 입력해 주세요.</p>
        ) : (
          <div className="pm-canvas" style={{ width: `${zoom * 100}%` }} onClick={onTap}>
            <img
              ref={imgRef}
              src={uri}
              alt="측정할 사진"
              draggable={false}
              onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            />
            <svg className="pm-lines" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
              {refPts.length === 2 && <line x1={refPts[0].x} y1={refPts[0].y} x2={refPts[1].x} y2={refPts[1].y} className="pm-ref" />}
              {tgtPts.length === 2 && <line x1={tgtPts[0].x} y1={tgtPts[0].y} x2={tgtPts[1].x} y2={tgtPts[1].y} className="pm-tgt" />}
            </svg>
            {refPts.map((p, i) => (
              <span key={`r${i}`} className="pm-dot pm-dot-ref" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} />
            ))}
            {tgtPts.map((p, i) => (
              <span key={`t${i}`} className="pm-dot pm-dot-tgt" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} />
            ))}
          </div>
        )}
      </div>

      <div className="pm-panel">
        {step === 'ref' && (
          <>
            <Notice>기준물과 측정할 부분이 같은 평면에 있는지 확인해 주세요. 정면에서 찍을수록 오차가 줄어요.</Notice>
            {refPts.length === 2 && (
              <>
                <Field label="기준물">
                  <ChipGroup label="기준물" value={preset} options={PRESETS.map((p) => ({ value: p.value, label: p.label }))} onChange={setPreset} />
                </Field>
                {preset === 'CUSTOM' ? (
                  <Field label="기준 길이" error={refText && !refParsed.ok ? '기준 길이를 확인해 주세요' : null}>
                    <LengthInput label="기준 길이" value={refText} onChange={setRefText} unit={unit} placeholder="예: 30" />
                  </Field>
                ) : (
                  <p className="hint">실제 용지 크기(A4)가 맞는지, 구겨지지 않았는지 확인해 주세요.</p>
                )}
              </>
            )}
            <Button disabled={refPts.length < 2 || refMm == null} onClick={() => setStep('target')}>
              다음: 측정할 길이 표시
            </Button>
          </>
        )}

        {step === 'target' && (
          <>
            <div className="btn-pair">
              <Button variant="soft" onClick={() => setStep('ref')}>
                기준선 다시
              </Button>
              <Button disabled={tgtPts.length < 2} onClick={() => setStep('result')}>
                계산하기
              </Button>
            </div>
          </>
        )}

        {step === 'result' && calc && (
          <>
            {calc.ok ? (
              <>
                <div className="pm-result">
                  <span className="origin origin-photo">사진 참고값</span>
                  <strong>{formatLength(calc.mm, unit)}</strong>
                </div>
                <details className="pm-detail">
                  <summary>계산 근거</summary>
                  <p>
                    기준 {formatLength(refMm, unit)} = {Math.round(calc.referencePx)}px → 1px ≈ {calc.mmPerPx.toFixed(2)}mm, 측정선 {Math.round(calc.targetPx)}px. 원근 보정은 하지 않았어요.
                  </p>
                </details>
                {calc.warnings.map((w) => (
                  <Notice key={w} tone="warn" icon="alert">
                    {PHOTO_WARNING_TEXT[w]}
                  </Notice>
                ))}
                <Notice tone="warn" icon="alert">
                  사진으로 계산한 값은 줄자로 한 번 더 확인해 주세요. 사진에서 보이지 않는 깊이·뒤쪽은 잴 수 없어요.
                </Notice>
                <Field label="어느 치수에 넣을까요?">
                  <ChipGroup label="적용할 치수" value={applyKey} options={APPLY_OPTIONS} onChange={setApplyKey} />
                </Field>
                <div className="btn-pair">
                  <Button
                    variant="soft"
                    onClick={() => {
                      setTgtPts([]);
                      setStep('target');
                    }}
                  >
                    다시 지정
                  </Button>
                  <Button onClick={apply}>측정값 넣기</Button>
                </div>
              </>
            ) : (
              <>
                <Notice tone="warn" icon="alert">
                  {photoError(calc)}
                </Notice>
                <div className="btn-pair">
                  <Button
                    variant="soft"
                    onClick={() => {
                      setRefPts([]);
                      setTgtPts([]);
                      setStep('ref');
                    }}
                  >
                    처음부터
                  </Button>
                  <Button variant="soft" onClick={onClose}>
                    직접 입력하기
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

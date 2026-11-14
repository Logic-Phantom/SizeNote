// 비교 결과 표시(비교 화면·기록 상세 공용). 판정 + 축별 대조 + 미확인 목록 + 주의 + 반입 경로.
import type { ComparisonResult } from '../domain/comparison';
import type { PassageResult } from '../domain/passage';
import { formatLength, type Unit } from '../domain/units';
import { AXIS_LABEL, CAUTION_TEXT, CLEARANCE_TEXT, FRONT_REASON_TEXT, REVIEW_REASON_TEXT, SEGMENT_REASON_TEXT } from '../screens/labels';
import { Icon } from './Icon';
import { Notice, OriginBadge, StatusBadge } from './ui';

const RESULT_HEAD: Record<ComparisonResult['status'], string> = {
  FIT: '입력한 치수 기준으로 모든 조건을 통과했어요.',
  OVER: '입력한 공간 치수보다 제품이 커요.',
  REVIEW: '확인하지 않은 치수나 조건이 있어 결과를 확정할 수 없어요.',
};

export function ResultView({ result, passage, unit }: { result: ComparisonResult; passage: PassageResult | null; unit: Unit }) {
  const f = (mm: number | null) => formatLength(mm, unit);
  return (
    <div className="result">
      <div className={`result-head result-${result.status.toLowerCase()}`}>
        <StatusBadge status={result.status} />
        <p>{RESULT_HEAD[result.status]}</p>
      </div>

      <div className="rows">
        {result.axes.map((a) => (
          <div key={a.axis} className="axis-row">
            <div className="axis-top">
              <span className="axis-name">{AXIS_LABEL[a.axis]}</span>
              <span className="axis-cmp">
                공간 {f(a.spaceMm)} · 필요 {f(a.requiredMm)}
              </span>
              <AxisMark status={a.status} />
            </div>
            <div className="axis-sub">
              {a.spaceOrigin && <OriginBadge origin={a.spaceOrigin} />}
              {a.productMm != null && a.axis !== 'frontSpace' && (
                <span>
                  제품 {f(a.productMm)}
                  {a.clearanceMm > 0 && ` + 설치 여유 ${f(a.clearanceMm)}`}
                </span>
              )}
              {a.marginMm != null && <span>{a.marginMm >= 0 ? `남는 공간 ${f(a.marginMm)}` : `${f(-a.marginMm)} 초과`}</span>}
            </div>
            {a.reasons.length > 0 && (
              <ul className="axis-reasons">
                {a.reasons.map((r) => (
                  <li key={r}>
                    {a.axis === 'frontSpace' ? FRONT_REASON_TEXT[r] : REVIEW_REASON_TEXT[r]}
                    {r === 'CLEARANCE_UNKNOWN' && ` (${a.unknownClearances.map((k) => CLEARANCE_TEXT[k]).join('·')})`}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {result.cautions.map((c) => (
        <Notice key={c} tone="warn" icon="alert">
          {CAUTION_TEXT[c]}
        </Notice>
      ))}

      {passage && (
        <>
          <h3 className="sub-title">반입 경로 (단순 비교)</h3>
          <div className="rows">
            {passage.segments.length === 0 && <div className="row">등록한 경로 구간이 없어요</div>}
            {passage.segments.map((s) => (
              <div key={s.segmentId} className="axis-row">
                <div className="axis-top">
                  <span className="axis-name">{s.name}</span>
                  <span className="axis-cmp">
                    폭 {f(s.segmentWidthMm)} · 높이 {f(s.segmentHeightMm)}
                  </span>
                  <AxisMark status={s.status === 'SIMPLE_PASS' ? 'FIT' : 'REVIEW'} />
                </div>
                {s.reasons.length > 0 && (
                  <ul className="axis-reasons">
                    {s.reasons.map((r) => (
                      <li key={r}>{SEGMENT_REASON_TEXT[r]}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <p className="hint">
            {passage.status === 'SIMPLE_PASS' ? '통과 규격 충족(단순 비교). ' : '현장 확인이 필요해요. '}
            회전·기울이기·코너는 계산하지 않아요. 배송·설치 기사님 확인을 대신하지 않아요.
          </p>
        </>
      )}

      <p className="hint">입력한 값에 근거한 참고 결과이며 실제 설치를 보증하지 않아요. 제품 설명서의 설치 조건도 확인해 주세요.</p>
    </div>
  );
}

function AxisMark({ status }: { status: 'FIT' | 'OVER' | 'REVIEW' }) {
  const map = { FIT: ['check', '충족'], OVER: ['x', '초과'], REVIEW: ['alert', '확인 필요'] } as const;
  const [icon, text] = map[status];
  return (
    <span className={`axis-mark mark-${status.toLowerCase()}`}>
      <Icon name={icon} size={16} stroke={2.4} />
      {text}
    </span>
  );
}

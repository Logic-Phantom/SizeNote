// 비교 기록 상세: 비교 당시 스냅샷 그대로(다시 계산하지 않음). 지금 값으로 다시 비교하는 버튼 제공.
import { useNavigate, useParams } from 'react-router-dom';
import { useOverlay } from '../components/overlay';
import { ResultView } from '../components/ResultView';
import { Button, Header, Notice, Screen, SectionTitle } from '../components/ui';
import { PRODUCT_LABEL, SPEC_SOURCE_LABEL, TARGET_LABEL } from '../domain/catalog';
import { deleteComparison } from '../domain/records';
import { useApp } from '../state/store';
import { formatDate } from './format';
import { dimsText } from './Products';

export function HistoryDetail() {
  const { id } = useParams();
  const { state, commit } = useApp();
  const { confirm, toast } = useOverlay();
  const navigate = useNavigate();
  const unit = state.displayUnit;
  const c = state.comparisons.find((x) => x.id === id);

  if (!c) {
    return (
      <Screen>
        <Header title="비교 기록" />
        <Notice tone="warn" icon="alert">
          삭제되었거나 찾을 수 없는 기록이에요.
        </Notice>
      </Screen>
    );
  }

  const m = c.measurement;
  const p = c.product;
  const canRecompare = state.measurements.some((x) => x.id === m.id) && state.products.some((x) => x.id === p.id);

  async function remove() {
    const yes = await confirm({ title: '이 비교 기록을 삭제할까요?', confirmText: '삭제', danger: true });
    if (!yes) return;
    const ok = await commit((s) => deleteComparison(s, c!.id));
    toast(ok ? '비교 기록을 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
    if (ok) navigate('/history', { replace: true });
  }

  return (
    <Screen>
      <Header title="비교 기록" />
      <p className="hint">{formatDate(c.comparedAt)}에 비교한 값 그대로예요. 이후에 고친 공간·제품 정보는 반영되지 않아요.</p>

      <div className="rows">
        <div className="row">
          <span className="row-label">자리</span>
          <span className="row-value">
            {c.spaceName} · {m.name} ({TARGET_LABEL[m.kind]})
          </span>
        </div>
        <div className="row">
          <span className="row-label">제품</span>
          <span className="row-value">
            {p.name} ({PRODUCT_LABEL[p.category]})
          </span>
        </div>
        <div className="row">
          <span className="row-label">제품 크기</span>
          <span className="row-value">{dimsText(p.size, unit)}</span>
        </div>
        <div className="row">
          <span className="row-label">제원 출처</span>
          <span className="row-value">{SPEC_SOURCE_LABEL[p.source]}</span>
        </div>
        <div className="row">
          <span className="row-label">측정일</span>
          <span className="row-value">{m.measuredOn ? formatDate(m.measuredOn) : '없음'}</span>
        </div>
      </div>

      <SectionTitle>결과</SectionTitle>
      <ResultView result={c.result} passage={c.passage} unit={unit} />
      <p className="hint">판정 기준 버전 {c.result.algorithmVersion}</p>

      {canRecompare && (
        <Button variant="soft" onClick={() => navigate(`/compare?m=${m.id}&p=${p.id}`)}>
          지금 값으로 다시 비교
        </Button>
      )}
      <Button variant="ghost" icon="trash" onClick={remove}>
        기록 삭제
      </Button>
    </Screen>
  );
}

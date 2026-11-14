// 비교 기록 목록. 각 기록은 비교 당시 값의 스냅샷이라 이후 공간·제품을 고쳐도 바뀌지 않는다.
import { Icon } from '../components/Icon';
import { useOverlay } from '../components/overlay';
import { Card, Empty, Header, Screen, StatusBadge } from '../components/ui';
import { deleteComparison } from '../domain/records';
import { LIMITS } from '../domain/types';
import { useApp } from '../state/store';
import { formatDate } from './format';

export function History() {
  const { state, commit } = useApp();
  const { confirm, toast } = useOverlay();

  async function remove(id: string, name: string) {
    const yes = await confirm({ title: `'${name}' 비교 기록을 삭제할까요?`, confirmText: '삭제', danger: true });
    if (!yes) return;
    const ok = await commit((s) => deleteComparison(s, id));
    toast(ok ? '비교 기록을 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
  }

  return (
    <Screen tabbar>
      <Header title="비교 기록" back={false} />
      {state.comparisons.length === 0 ? (
        <Empty icon="scale" title="아직 비교한 기록이 없어요" desc={'공간에 측정 항목을 등록하고\n사려는 제품과 비교해 보세요.'} />
      ) : (
        <>
          <p className="hint">최근 {LIMITS.comparisons}개까지 보관해요. 입력한 값 기준의 참고 결과이며 실제 설치를 보증하지 않아요.</p>
          {state.comparisons.map((c) => (
            <Card key={c.id}>
              <div className="card-main">
                <span className="card-title">{c.product.name}</span>
                <span className="card-sub">
                  {c.spaceName} · {c.measurement.name} · {formatDate(c.comparedAt)}
                </span>
                <span>
                  <StatusBadge status={c.result.status} />
                </span>
              </div>
              <button type="button" className="icon-btn" aria-label={`${c.product.name} 비교 기록 삭제`} onClick={() => remove(c.id, c.product.name)}>
                <Icon name="x" size={18} color="var(--c-text-4)" />
              </button>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

// 비교 기록 목록. 각 기록은 비교 당시 값의 스냅샷이라 이후 공간·제품을 고쳐도 바뀌지 않는다. 삭제는 상세에서.
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Button, Card, Empty, Header, Screen, StatusBadge } from '../components/ui';
import { LIMITS } from '../domain/types';
import { useApp } from '../state/store';
import { formatDate } from './format';

export function History() {
  const { state } = useApp();
  const navigate = useNavigate();

  return (
    <Screen tabbar>
      <Header title="비교" back={false} />
      <Button icon="scale" onClick={() => navigate('/compare')}>
        제품 크기 비교하기
      </Button>
      <div className="btn-pair">
        <Button variant="soft" icon="box" onClick={() => navigate('/products')}>
          사려는 제품
        </Button>
        <Button variant="soft" icon="door" onClick={() => navigate('/passages')}>
          반입 경로
        </Button>
      </div>

      <h2 className="sub-title">비교 기록</h2>
      {state.comparisons.length === 0 ? (
        <Empty icon="scale" title="아직 저장한 비교 기록이 없어요" desc={'공간에 측정 항목을 등록하고\n사려는 제품과 비교해 보세요.'} />
      ) : (
        <>
          <p className="hint">최근 {LIMITS.comparisons}개까지 보관해요. 입력한 값 기준의 참고 결과이며 실제 설치를 보증하지 않아요.</p>
          {state.comparisons.map((c) => (
            <Card key={c.id} onClick={() => navigate(`/history/${c.id}`)} label={`${c.product.name} 비교 기록`}>
              <div className="card-main">
                <span className="card-title">{c.product.name}</span>
                <span className="card-sub">
                  {c.spaceName} · {c.measurement.name} · {formatDate(c.comparedAt)}
                </span>
                <span>
                  <StatusBadge status={c.result.status} />
                </span>
              </div>
              <Icon name="chevron-right" size={18} color="var(--c-text-4)" />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

// 홈: 진입 즉시 핵심 행동(공간 등록·제품 비교)을 보여 준다. 권한·바텀시트·광고 자동 노출 없음.
import { useNavigate } from 'react-router-dom';
import { SPACE_LABEL } from '../domain/catalog';
import { Icon } from '../components/Icon';
import { Button, Card, Empty, Screen, SectionTitle, StatusBadge } from '../components/ui';
import { useApp } from '../state/store';
import { formatDay } from './format';

export function Home() {
  const { state } = useApp();
  const navigate = useNavigate();
  const count = (spaceId: string) => state.measurements.filter((m) => m.spaceId === spaceId).length;
  const spaces = [...state.spaces].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Screen tabbar>
      <div className="home-head">
        <span className="brand">
          <Icon name="ruler" size={22} />
          사이즈 어때?
        </span>
      </div>
      <section className="home-hero">
        <h2>
          사기 전에,
          <br />
          우리 집에 맞는지.
        </h2>
        <p>공간 치수를 저장해 두고 사려는 제품과 비교해 보세요.</p>
      </section>

      <SectionTitle
        right={
          spaces.length > 0 && (
            <button type="button" className="icon-btn" aria-label="공간 추가" onClick={() => navigate('/space/new')}>
              <Icon name="plus" />
            </button>
          )
        }
      >
        내 공간
      </SectionTitle>

      {spaces.length === 0 ? (
        <Empty
          title="아직 등록한 공간이 없어요"
          desc={'주방·거실처럼 공간을 먼저 만들고\n냉장고 자리 같은 치수를 기록해 보세요.'}
          action={<Button onClick={() => navigate('/space/new')}>우리 집 공간 등록하기</Button>}
        />
      ) : (
        spaces.map((s) => (
          <Card key={s.id} onClick={() => navigate(`/space/${s.id}/edit`)} label={`${s.name} 공간`}>
            <div className="space-icon">
              <Icon name="home" />
            </div>
            <div className="card-main">
              <span className="card-title">{s.name}</span>
              <span className="card-sub">
                {SPACE_LABEL[s.category]} · {count(s.id)}개 항목 · 최근 {formatDay(s.updatedAt)}
              </span>
            </div>
            <Icon name="chevron-right" size={18} color="var(--c-text-4)" />
          </Card>
        ))
      )}

      {state.comparisons.length > 0 && (
        <>
          <SectionTitle>최근 비교</SectionTitle>
          {state.comparisons.slice(0, 3).map((c) => (
            <Card key={c.id}>
              <div className="card-main">
                <span className="card-title">{c.product.name}</span>
                <span className="card-sub">
                  {c.spaceName} · {c.measurement.name} · {formatDay(c.comparedAt)}
                </span>
              </div>
              <StatusBadge status={c.result.status} />
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}

// 공간 상세: 측정 대상 목록(대표 치수·출처·측정일·사진 썸네일) + 추가.
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Button, Card, Empty, Header, Notice, OriginBadge, Screen, SectionTitle } from '../components/ui';
import { SPACE_LABEL, TARGET_LABEL } from '../domain/catalog';
import { isStale } from '../domain/comparison';
import { DIM_KEYS, type Measurement, type ValueOrigin } from '../domain/types';
import { formatLength, type Unit } from '../domain/units';
import { useApp, usePhoto } from '../state/store';
import { formatDate } from './format';
import { DIM_LABEL } from './labels';

export function SpaceDetail() {
  const { id } = useParams();
  const { state } = useApp();
  const navigate = useNavigate();
  const space = state.spaces.find((s) => s.id === id);

  if (!space) {
    return (
      <Screen>
        <Header title="공간" />
        <Notice tone="warn" icon="alert">
          삭제되었거나 찾을 수 없는 공간이에요.
        </Notice>
      </Screen>
    );
  }

  const items = state.measurements.filter((m) => m.spaceId === space.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <Screen footer={<Button onClick={() => navigate(`/space/${space.id}/measure/new`)}>측정 대상 추가하기</Button>}>
      <Header
        title={space.name}
        right={
          <button type="button" className="icon-btn" aria-label="공간 정보 수정" onClick={() => navigate(`/space/${space.id}/edit`)}>
            <Icon name="edit" />
          </button>
        }
      />
      <div className="rows">
        <div className="row">
          <span className="row-label">종류</span>
          <span className="row-value">{SPACE_LABEL[space.category]}</span>
        </div>
        {space.note && (
          <div className="row">
            <span className="row-label">메모</span>
            <span className="row-value">{space.note}</span>
          </div>
        )}
      </div>

      <SectionTitle>측정 대상 {items.length > 0 && <span className="muted">{items.length}</span>}</SectionTitle>
      {items.length === 0 ? (
        <Empty title="아직 측정한 자리가 없어요" desc={'냉장고 자리·세탁기 자리처럼\n제품이 들어갈 자리를 재서 기록해 보세요.'} />
      ) : (
        items.map((m) => <MeasurementCard key={m.id} m={m} unit={state.displayUnit} onClick={() => navigate(`/measure/${m.id}`)} />)
      )}
    </Screen>
  );
}

export function MeasurementCard({ m, unit, onClick }: { m: Measurement; unit: Unit; onClick: () => void }) {
  const photo = usePhoto(m.photoIds[0]);
  const dims = DIM_KEYS.filter((k) => m[k]).map((k) => `${DIM_LABEL[k]} ${formatLength(m[k]!.mm, unit)}`);
  const origins = new Set<ValueOrigin>(DIM_KEYS.map((k) => m[k]?.origin).filter((o): o is ValueOrigin => o != null));
  const stale = m.measuredOn ? isStale(m.measuredOn, new Date()) : false;
  return (
    <Card onClick={onClick} label={`${m.name} 측정 기록`}>
      <div className="thumb">{photo ? <img src={photo} alt="" /> : <Icon name="ruler" size={24} color="var(--c-primary)" />}</div>
      <div className="card-main">
        <span className="card-title">{m.name}</span>
        <span className="card-sub">{dims.length ? dims.join(' · ') : '치수 미입력'}</span>
        <span className="badges">
          {[...origins].map((o) => (
            <OriginBadge key={o} origin={o} />
          ))}
          <span className="card-sub">
            {TARGET_LABEL[m.kind]} · {m.measuredOn ? formatDate(m.measuredOn) : '측정일 없음'}
            {stale && ' · 재측정 권장'}
          </span>
        </span>
      </div>
      <Icon name="chevron-right" size={18} color="var(--c-text-4)" />
    </Card>
  );
}

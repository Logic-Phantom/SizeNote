// 제품 비교: 측정 대상 1개 × 제품 후보 최대 3개(+ 선택 시 반입 경로). 결과는 저장해야 기록에 남는다.
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChipGroup, Field } from '../components/forms';
import { Icon } from '../components/Icon';
import { useOverlay } from '../components/overlay';
import { ResultView } from '../components/ResultView';
import { Button, Empty, Header, Notice, Screen, SectionTitle, StatusBadge } from '../components/ui';
import { PRODUCT_LABEL, TARGET_TO_PRODUCT } from '../domain/catalog';
import { compareCandidates, MAX_CANDIDATES } from '../domain/comparison';
import { checkPassage, type PassageBasis, type PassageFacing } from '../domain/passage';
import { recordComparison } from '../domain/records';
import { formatLength } from '../domain/units';
import { useApp } from '../state/store';
import { dimsText } from './Products';

type PassageMode = 'OFF' | PassageBasis;

export function Compare() {
  const { state, commit } = useApp();
  const { toast } = useOverlay();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const unit = state.displayUnit;

  const [mId, setMId] = useState(() => params.get('m') ?? state.measurements[0]?.id ?? '');
  const measurement = state.measurements.find((m) => m.id === mId);
  const [picked, setPicked] = useState<string[]>(() => {
    const p = params.get('p');
    return p && state.products.some((x) => x.id === p) ? [p] : [];
  });
  const [passageMode, setPassageMode] = useState<PassageMode>('OFF');
  const [facing, setFacing] = useState<PassageFacing>('WIDTH');
  const [shown, setShown] = useState(false);
  const [savedIds, setSavedIds] = useState<string[]>([]);

  const products = useMemo(() => {
    const prefer = measurement ? TARGET_TO_PRODUCT[measurement.kind] : undefined;
    return [...state.products].sort((a, b) => Number(b.category === prefer) - Number(a.category === prefer) || b.updatedAt.localeCompare(a.updatedAt));
  }, [state.products, measurement]);

  const selected = picked.map((id) => state.products.find((p) => p.id === id)).filter((p) => p != null);
  const results = shown && measurement ? compareCandidates(measurement, selected) : [];

  const reset = () => {
    setShown(false);
    setSavedIds([]);
  };

  function toggle(id: string) {
    reset();
    setPicked((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length >= MAX_CANDIDATES ? ids : [...ids, id]));
    if (!picked.includes(id) && picked.length >= MAX_CANDIDATES) toast(`후보는 ${MAX_CANDIDATES}개까지 고를 수 있어요`);
  }

  async function save(productId: string) {
    if (!measurement || savedIds.includes(productId)) return;
    const product = state.products.find((p) => p.id === productId)!;
    const passage = passageMode === 'OFF' ? null : checkPassage(product, state.passages, passageMode, facing);
    const ok = await commit((s) => {
      const r = recordComparison(s, measurement.id, productId, passage);
      if (!r) throw new Error('missing');
      return r.state;
    });
    if (ok) setSavedIds((x) => [...x, productId]);
    toast(ok ? '비교 기록을 저장했어요' : '저장하지 못했어요. 다시 시도해 주세요');
  }

  if (state.measurements.length === 0 || state.products.length === 0) {
    return (
      <Screen>
        <Header title="제품 크기 비교" />
        {state.measurements.length === 0 ? (
          <Empty title="먼저 공간 치수를 기록해 주세요" desc="비교할 자리(예: 냉장고 자리)를 재서 저장하면 제품과 비교할 수 있어요." action={<Button onClick={() => navigate('/')}>공간 등록하러 가기</Button>} />
        ) : (
          <Empty icon="box" title="비교할 제품을 등록해 주세요" desc="제품 설명서에 적힌 크기와 설치 여유를 입력해 주세요." action={<Button onClick={() => navigate('/product/new')}>제품 추가하기</Button>} />
        )}
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        !shown && (
          <Button disabled={!measurement || selected.length === 0} onClick={() => setShown(true)}>
            {selected.length > 1 ? `후보 ${selected.length}개 비교하기` : '비교하기'}
          </Button>
        )
      }
    >
      <Header title="제품 크기 비교" />

      <Field label="어느 자리에 놓을까요?">
        <select
          className="input"
          value={mId}
          onChange={(e) => {
            reset();
            setMId(e.target.value);
          }}
          aria-label="비교할 측정 대상"
        >
          {state.spaces.map((s) => {
            const items = state.measurements.filter((m) => m.spaceId === s.id);
            return items.length ? (
              <optgroup key={s.id} label={s.name}>
                {items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            ) : null;
          })}
        </select>
      </Field>
      {measurement && (
        <p className="hint">
          가로 {formatLength(measurement.width?.mm, unit)} · 깊이 {formatLength(measurement.depth?.mm, unit)} · 높이 {formatLength(measurement.height?.mm, unit)}
          {measurement.frontSpace && ` · 앞쪽 ${formatLength(measurement.frontSpace.mm, unit)}`}
        </p>
      )}

      <SectionTitle
        right={
          <button type="button" className="text-btn" onClick={() => navigate('/product/new')}>
            + 제품 추가
          </button>
        }
      >
        제품 후보 <span className="muted">{selected.length}/{MAX_CANDIDATES}</span>
      </SectionTitle>
      <div className="pick-list" role="group" aria-label="비교할 제품 후보">
        {products.map((p) => {
          const on = picked.includes(p.id);
          return (
            <button key={p.id} type="button" className={`pick${on ? ' active' : ''}`} aria-pressed={on} onClick={() => toggle(p.id)}>
              <span className="pick-check">{on && <Icon name="check" size={16} stroke={2.6} />}</span>
              <span className="card-main">
                <span className="card-title">{p.name}</span>
                <span className="card-sub">
                  {PRODUCT_LABEL[p.category]} · {dimsText(p.size, unit)}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <SectionTitle>반입 경로도 확인할까요?</SectionTitle>
      {state.passages.length === 0 ? (
        <p className="hint">
          현관문·엘리베이터 같은 경로를 등록하면 함께 확인할 수 있어요.{' '}
          <button type="button" className="text-btn inline" onClick={() => navigate('/passages')}>
            경로 등록
          </button>
        </p>
      ) : (
        <>
          <ChipGroup
            label="반입 경로 확인"
            value={passageMode}
            options={[
              { value: 'OFF', label: '확인 안 함' },
              { value: 'BODY', label: '본체 크기로' },
              { value: 'PACKAGE', label: '포장 크기로' },
            ]}
            onChange={(v) => {
              reset();
              setPassageMode(v);
            }}
          />
          {passageMode !== 'OFF' && (
            <Field label="통로를 지날 때 앞에 오는 면" hint="통로 폭과 비교할 제품 치수예요. 회전·기울이기는 계산하지 않아요.">
              <ChipGroup
                label="통과 방향"
                value={facing}
                options={[
                  { value: 'WIDTH', label: '정면(가로)' },
                  { value: 'DEPTH', label: '옆면(깊이)' },
                ]}
                onChange={(v) => {
                  reset();
                  setFacing(v);
                }}
              />
            </Field>
          )}
        </>
      )}

      {shown && measurement && (
        <>
          {results.length > 1 && (
            <>
              <SectionTitle>후보 한눈에 보기</SectionTitle>
              <div className="rows">
                {results.map(({ product, result }) => (
                  <div key={product.id} className="row">
                    <span className="row-label">{product.name}</span>
                    <StatusBadge status={result.status} />
                  </div>
                ))}
              </div>
            </>
          )}
          {results.map(({ product, result }) => {
            const passage = passageMode === 'OFF' ? null : checkPassage(product, state.passages, passageMode, facing);
            const done = savedIds.includes(product.id);
            return (
              <section key={product.id} className="result-block" aria-label={`${product.name} 비교 결과`}>
                <SectionTitle>{product.name}</SectionTitle>
                <ResultView result={result} passage={passage} unit={unit} />
                <div className="btn-pair">
                  <Button variant="soft" onClick={() => navigate(`/product/${product.id}`)}>
                    제품 정보 수정
                  </Button>
                  <Button disabled={done} onClick={() => save(product.id)}>
                    {done ? '저장했어요' : '비교 기록 저장'}
                  </Button>
                </div>
              </section>
            );
          })}
          <Notice>제품 설명서의 설치 조건(환기·배관·전원 위치)도 함께 확인해 주세요.</Notice>
          <Button variant="ghost" onClick={reset}>
            다른 조건으로 비교
          </Button>
        </>
      )}
    </Screen>
  );
}

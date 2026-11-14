// 반입 경로 구간(공동현관·엘리베이터·복도·현관문·방문·계단) 목록과 편집. 설치 자리 판정과 분리된 단순 선별용.
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChipGroup, Field, LengthInput } from '../components/forms';
import { Icon } from '../components/Icon';
import { useOverlay } from '../components/overlay';
import { Button, Card, Empty, Header, Notice, Screen } from '../components/ui';
import { PASSAGE_LABEL } from '../domain/catalog';
import { deletePassage, LimitError, newId, upsertPassage } from '../domain/records';
import { LIMITS, type PassageKind, type PassageSegment } from '../domain/types';
import { formatLength, parseLength, toInputText, type ParseResult } from '../domain/units';
import { useApp } from '../state/store';
import { parseError } from './labels';

const KINDS = Object.keys(PASSAGE_LABEL) as PassageKind[];

export function PassageList() {
  const { state } = useApp();
  const navigate = useNavigate();
  const unit = state.displayUnit;
  return (
    <Screen footer={<Button onClick={() => navigate('/passage/new')}>경로 구간 추가하기</Button>}>
      <Header title="반입 경로" />
      <Notice>
        제품이 집 안까지 들어오는 길에서 가장 좁은 곳을 재 두세요. 폭·높이를 단순 비교만 하고, 회전·기울이기·코너는 계산하지 않아요.
      </Notice>
      {state.passages.length === 0 ? (
        <Empty icon="door" title="등록한 경로 구간이 없어요" desc={'현관문, 엘리베이터 문처럼\n좁은 구간의 폭과 높이를 기록해 보세요.'} />
      ) : (
        state.passages.map((s) => (
          <Card key={s.id} onClick={() => navigate(`/passage/${s.id}`)} label={`${s.name} 경로 구간`}>
            <div className="space-icon">
              <Icon name="door" />
            </div>
            <div className="card-main">
              <span className="card-title">{s.name}</span>
              <span className="card-sub">
                폭 {formatLength(s.widthMm, unit)} · 높이 {formatLength(s.heightMm, unit)}
                {s.depthMm != null && ` · 깊이 ${formatLength(s.depthMm, unit)}`}
              </span>
              <span className="card-sub">{s.turning === true ? '꺾임 있음' : s.turning === false ? '직선' : '꺾임 여부 모름'}</span>
            </div>
            <Icon name="chevron-right" size={18} color="var(--c-text-4)" />
          </Card>
        ))
      )}
    </Screen>
  );
}

type Turning = 'UNKNOWN' | 'STRAIGHT' | 'TURN';

export function PassageEditor() {
  const { id } = useParams();
  const { state, commit } = useApp();
  const { toast, confirm } = useOverlay();
  const navigate = useNavigate();
  const unit = state.displayUnit;
  const existing = id ? state.passages.find((p) => p.id === id) : undefined;

  const [kind, setKind] = useState<PassageKind>(existing?.kind ?? 'FRONT_DOOR');
  const [name, setName] = useState(existing?.name ?? '');
  const [w, setW] = useState(toInputText(existing?.widthMm, unit));
  const [h, setH] = useState(toInputText(existing?.heightMm, unit));
  const [d, setD] = useState(toInputText(existing?.depthMm, unit));
  const [turning, setTurning] = useState<Turning>(existing?.turning === true ? 'TURN' : existing?.turning === false ? 'STRAIGHT' : 'UNKNOWN');
  const [note, setNote] = useState(existing?.note ?? '');
  const [tried, setTried] = useState(false);

  if (id && !existing) {
    return (
      <Screen>
        <Header title="경로 구간" />
        <Notice tone="warn" icon="alert">
          삭제되었거나 찾을 수 없는 구간이에요.
        </Notice>
      </Screen>
    );
  }

  const p = (t: string): ParseResult | null => (t.trim() ? parseLength(t, unit) : null);
  const pw = p(w);
  const ph = p(h);
  const pd = p(d);
  const err = (r: ParseResult | null) => (r ? parseError(r) : null);
  const hasError = !!(err(pw) || err(ph) || err(pd));
  const mm = (r: ParseResult | null) => (r?.ok ? r.mm : null);

  async function save() {
    setTried(true);
    if (hasError) return;
    const now = new Date();
    const seg: PassageSegment = {
      id: existing?.id ?? newId('g', now),
      name: name.trim() || PASSAGE_LABEL[kind],
      kind,
      widthMm: mm(pw),
      heightMm: mm(ph),
      depthMm: mm(pd),
      turning: turning === 'UNKNOWN' ? null : turning === 'TURN',
      note: note.trim(),
      updatedAt: now.toISOString(),
    };
    let limit = false;
    const ok = await commit((s) => {
      try {
        return upsertPassage(s, seg, now);
      } catch (e) {
        limit = e instanceof LimitError;
        throw e;
      }
    });
    if (!ok) {
      toast(limit ? `경로 구간은 ${LIMITS.passages}개까지 등록할 수 있어요` : '저장하지 못했어요. 다시 시도해 주세요');
      return;
    }
    toast('경로 구간을 저장했어요');
    navigate('/passages', { replace: true });
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({ title: `'${existing.name}' 구간을 삭제할까요?`, confirmText: '삭제', danger: true });
    if (!yes) return;
    const ok = await commit((s) => deletePassage(s, existing.id));
    toast(ok ? '구간을 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
    if (ok) navigate('/passages', { replace: true });
  }

  return (
    <Screen footer={<Button onClick={save}>저장하기</Button>}>
      <Header title={existing ? '경로 구간' : '경로 구간 추가'} />
      <Field label="구간 종류">
        <ChipGroup label="구간 종류" value={kind} options={KINDS.map((k) => ({ value: k, label: PASSAGE_LABEL[k] }))} onChange={setKind} />
      </Field>
      <Field label="이름">
        <input className="input" value={name} maxLength={LIMITS.name} placeholder={PASSAGE_LABEL[kind]} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="통과 폭" hint="문틀·손잡이를 뺀 실제로 지나갈 수 있는 폭" error={tried || w ? err(pw) : null}>
        <LengthInput label="통과 폭" value={w} onChange={setW} unit={unit} />
      </Field>
      <Field label="통과 높이" error={tried || h ? err(ph) : null}>
        <LengthInput label="통과 높이" value={h} onChange={setH} unit={unit} />
      </Field>
      <Field label="내부 깊이 (선택)" hint="엘리베이터 안쪽 깊이 등. 지금은 기록용이에요" error={tried || d ? err(pd) : null}>
        <LengthInput label="내부 깊이" value={d} onChange={setD} unit={unit} />
      </Field>
      <Field label="꺾거나 돌려야 하나요?">
        <ChipGroup
          label="꺾임 여부"
          value={turning}
          options={[
            { value: 'STRAIGHT', label: '직선' },
            { value: 'TURN', label: '꺾임 있음' },
            { value: 'UNKNOWN', label: '모름' },
          ]}
          onChange={setTurning}
        />
      </Field>
      <Field label="메모 (선택)">
        <textarea className="input" value={note} maxLength={LIMITS.note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {existing && (
        <Button variant="ghost" icon="trash" onClick={remove}>
          구간 삭제
        </Button>
      )}
    </Screen>
  );
}

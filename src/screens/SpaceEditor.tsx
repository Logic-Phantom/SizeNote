// 공간 추가·수정·삭제. 첫 저장 전에 '이 기기에만 저장돼요' 안내를 한 번 보여 준다(기획 §8.3).
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useOverlay } from '../components/overlay';
import { Button, Header, Notice, Screen } from '../components/ui';
import { SPACE_LABEL } from '../domain/catalog';
import { deleteSpace, newId, upsertSpace } from '../domain/records';
import { LIMITS, type Space, type SpaceCategory } from '../domain/types';
import { useApp } from '../state/store';

const CATEGORIES = Object.keys(SPACE_LABEL) as SpaceCategory[];

export function SpaceEditor() {
  const { id } = useParams();
  const { state, commit } = useApp();
  const { toast, confirm } = useOverlay();
  const navigate = useNavigate();
  const existing = id ? state.spaces.find((s) => s.id === id) : undefined;

  const [category, setCategory] = useState<SpaceCategory>(existing?.category ?? 'KITCHEN');
  const [name, setName] = useState(existing?.name ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [busy, setBusy] = useState(false);

  if (id && !existing) {
    return (
      <Screen>
        <Header title="공간" />
        <Notice tone="warn" icon="alert">
          삭제되었거나 찾을 수 없는 공간이에요.
        </Notice>
      </Screen>
    );
  }

  const finalName = name.trim() || SPACE_LABEL[category];
  const measurementCount = existing ? state.measurements.filter((m) => m.spaceId === existing.id).length : 0;

  async function save() {
    if (busy) return; // 중복 클릭 방지
    setBusy(true);
    const now = new Date();
    const space: Space = existing
      ? { ...existing, name: finalName, category, note: note.trim() }
      : { id: newId('s', now), name: finalName, category, note: note.trim(), createdAt: now.toISOString(), updatedAt: now.toISOString() };
    const ok = await commit((s) => ({ ...upsertSpace(s, space, now), storageNoticeSeen: true }));
    setBusy(false);
    if (!ok) {
      toast(state.spaces.length >= LIMITS.spaces && !existing ? `공간은 ${LIMITS.spaces}개까지 만들 수 있어요` : '저장하지 못했어요. 다시 시도해 주세요');
      return;
    }
    toast(existing ? '공간을 고쳤어요' : '공간을 만들었어요');
    navigate('/', { replace: true });
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({
      title: `'${existing.name}' 공간을 삭제할까요?`,
      message: measurementCount ? `측정 항목 ${measurementCount}개와 사진도 함께 삭제돼요. 지난 비교 기록은 남아요.` : '지난 비교 기록은 남아요.',
      confirmText: '삭제',
      danger: true,
    });
    if (!yes) return;
    const ok = await commit((s) => deleteSpace(s, existing.id));
    toast(ok ? '공간을 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
    if (ok) navigate('/', { replace: true });
  }

  return (
    <Screen
      footer={
        <Button onClick={save} disabled={busy}>
          {existing ? '저장하기' : '공간 추가하기'}
        </Button>
      }
    >
      <Header title={existing ? '공간 수정' : '공간 추가'} />

      <div className="field">
        <span className="field-label">공간 종류</span>
        <div className="chips" role="radiogroup" aria-label="공간 종류">
          {CATEGORIES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={c === category} className={`chip${c === category ? ' active' : ''}`} onClick={() => setCategory(c)}>
              {SPACE_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <label className="field">
        <span className="field-label">공간 이름</span>
        <input className="input" value={name} maxLength={LIMITS.name} placeholder={SPACE_LABEL[category]} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="field">
        <span className="field-label">메모 (선택)</span>
        <textarea className="input" value={note} maxLength={LIMITS.note} placeholder="예: 싱크대 옆, 콘센트 오른쪽" onChange={(e) => setNote(e.target.value)} />
      </label>

      {!state.storageNoticeSeen && (
        <Notice>기록은 이 기기의 토스 앱 안에만 저장돼요. 앱을 지우거나 기기를 바꾸면 사라질 수 있어요.</Notice>
      )}

      {existing && (
        <Button variant="ghost" icon="trash" onClick={remove}>
          공간 삭제
        </Button>
      )}
    </Screen>
  );
}

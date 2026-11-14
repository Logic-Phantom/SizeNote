// 측정 대상 추가·수정: 종류 → 가로·깊이·높이·문 여는 공간(값마다 출처) → 측정일 → 사진(최대 3장, 사진 보조 측정) → 메모.
// 모든 치수는 선택 입력. 비교에 필요한 값이 없으면 비교 결과에서 '추가 확인 필요'로 보인다.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChipGroup, Field, LengthInput } from '../components/forms';
import { Icon } from '../components/Icon';
import { useOverlay } from '../components/overlay';
import { PhotoMeasure, type ApplyKey } from '../components/PhotoMeasure';
import { Button, Header, Notice, OriginBadge, Screen, SectionTitle } from '../components/ui';
import { TARGET_CHECKLIST, TARGET_LABEL } from '../domain/catalog';
import { deleteMeasurement, duplicateMeasurement, LimitError, newId, upsertMeasurement } from '../domain/records';
import { LIMITS, type MeasuredValue, type Measurement, type PhotoCalibration, type TargetKind, type ValueOrigin } from '../domain/types';
import { formatLength, parseLength, toInputText, type Unit } from '../domain/units';
import { compressPhoto } from '../platform/image';
import { pickAlbumPhoto, takePhoto, type PhotoResult } from '../platform/toss';
import { useApp, usePhoto } from '../state/store';
import { DIM_LABEL, parseError } from './labels';

const KINDS = Object.keys(TARGET_LABEL) as TargetKind[];
const KEYS: ApplyKey[] = ['width', 'depth', 'height', 'frontSpace'];
const KEY_LABEL: Record<ApplyKey, string> = { ...DIM_LABEL, frontSpace: '문 여는 공간(앞쪽)' };
const KEY_HINT: Partial<Record<ApplyKey, string>> = {
  width: '정면에서 봤을 때 좌우. 걸레받이·몰딩을 뺀 실제 쓸 수 있는 폭',
  depth: '정면에서 뒤쪽 벽까지. 배관·콘센트가 튀어나왔으면 그 앞까지',
  height: '바닥에서 위쪽(상부장·선반 아래)까지',
  frontSpace: '정면 앞쪽으로 비어 있는 거리. 문·서랍을 열 수 있는지 비교할 때 써요',
};
/** 직접 고를 수 있는 출처(사진 참고값은 사진 측정으로만 붙는다) */
const ORIGIN_OPTIONS: { value: ValueOrigin; label: string }[] = [
  { value: 'DIRECT', label: '직접 측정' },
  { value: 'DOCUMENT', label: '도면·문서' },
  { value: 'UNKNOWN', label: '출처 모름' },
];

interface DimDraft {
  text: string;
  origin: ValueOrigin;
  photo: PhotoCalibration | null;
}

function toDraft(v: MeasuredValue | null, unit: Unit): DimDraft {
  return { text: toInputText(v?.mm, unit), origin: v?.origin ?? 'DIRECT', photo: v?.photo ?? null };
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function MeasurementEditor() {
  const { spaceId, id } = useParams();
  const { state, commit, putPhoto, dropPhoto } = useApp();
  const { toast, confirm } = useOverlay();
  const navigate = useNavigate();
  const unit = state.displayUnit;
  const existing = id ? state.measurements.find((m) => m.id === id) : undefined;
  const space = state.spaces.find((s) => s.id === (existing?.spaceId ?? spaceId));

  const [kind, setKind] = useState<TargetKind>(existing?.kind ?? 'FRIDGE_SPOT');
  const [name, setName] = useState(existing?.name ?? '');
  const [dims, setDims] = useState<Record<ApplyKey, DimDraft>>(() => ({
    width: toDraft(existing?.width ?? null, unit),
    depth: toDraft(existing?.depth ?? null, unit),
    height: toDraft(existing?.height ?? null, unit),
    frontSpace: toDraft(existing?.frontSpace ?? null, unit),
  }));
  const [measuredOn, setMeasuredOn] = useState(existing?.measuredOn ?? today());
  const [photoIds, setPhotoIds] = useState<string[]>(existing?.photoIds ?? []);
  const [note, setNote] = useState(existing?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [measuring, setMeasuring] = useState<{ photoId: string; key: ApplyKey } | null>(null);
  const [tried, setTried] = useState(false);

  // 이번 편집에서 새로 저장한 사진: 저장하지 않고 나가면 지운다(고아 사진 방지)
  const sessionPhotos = useRef(new Set<string>());
  const saved = useRef(false);
  useEffect(
    () => () => {
      if (!saved.current) for (const pid of sessionPhotos.current) void dropPhoto(pid);
    },
    [dropPhoto],
  );

  if (!space || (id && !existing)) {
    return (
      <Screen>
        <Header title="측정 기록" />
        <Notice tone="warn" icon="alert">
          삭제되었거나 찾을 수 없는 기록이에요.
        </Notice>
      </Screen>
    );
  }

  const parsed = Object.fromEntries(KEYS.map((k) => [k, dims[k].text.trim() ? parseLength(dims[k].text, unit) : null])) as Record<ApplyKey, ReturnType<typeof parseLength> | null>;
  const errors = Object.fromEntries(KEYS.map((k) => [k, parsed[k] ? parseError(parsed[k]!) : null])) as Record<ApplyKey, string | null>;
  const hasError = KEYS.some((k) => errors[k]);
  const finalName = name.trim() || TARGET_LABEL[kind];

  function setText(k: ApplyKey, text: string) {
    setDims((d) => {
      const cur = d[k];
      // 사진 계산값을 손으로 고치면 '직접 측정(사용자 보정)'으로 바꾸고 계산 기록은 남긴다
      const p = parseLength(text, unit);
      const corrected = cur.origin === 'PHOTO' && cur.photo && (!p.ok || p.mm !== cur.photo.computedMm);
      return { ...d, [k]: { ...cur, text, origin: corrected ? 'DIRECT' : cur.origin } };
    });
  }

  function applyPhoto(k: ApplyKey, mm: number, calibration: PhotoCalibration) {
    setDims((d) => ({ ...d, [k]: { text: toInputText(mm, unit), origin: 'PHOTO', photo: calibration } }));
    setMeasuring(null);
    toast(`${KEY_LABEL[k]}에 사진 참고값을 넣었어요`);
  }

  async function addPhoto(source: 'camera' | 'album') {
    if (photoIds.length >= LIMITS.photosPerMeasurement) return;
    const r: PhotoResult = source === 'camera' ? await takePhoto() : await pickAlbumPhoto();
    if (!r.ok) {
      if (r.reason === 'denied') toast(source === 'camera' ? '카메라 권한이 없어 사진을 찍을 수 없어요' : '사진 접근 권한이 없어요');
      else if (r.reason === 'unavailable') toast('이 환경에서는 사진을 가져올 수 없어요. 치수는 직접 입력해 주세요');
      return;
    }
    const small = await compressPhoto(r.dataUri);
    if (!small) {
      toast('사진이 너무 커서 저장하지 못했어요. 치수는 직접 입력해 주세요');
      return;
    }
    const pid = newId('ph');
    if (!(await putPhoto(pid, small.dataUri))) {
      toast('사진을 저장하지 못했어요. 치수와 메모는 그대로 저장할 수 있어요');
      return;
    }
    sessionPhotos.current.add(pid);
    setPhotoIds((ids) => [...ids, pid]);
  }

  async function removePhoto(pid: string) {
    const used = KEYS.some((k) => dims[k].photo?.photoId === pid);
    const yes = await confirm({
      title: '사진을 뺄까요?',
      message: used ? '이 사진으로 계산한 치수 값은 그대로 남지만 사진은 다시 볼 수 없어요.' : undefined,
      confirmText: '빼기',
      danger: true,
    });
    if (!yes) return;
    setPhotoIds((ids) => ids.filter((x) => x !== pid));
    if (sessionPhotos.current.has(pid)) {
      sessionPhotos.current.delete(pid);
      void dropPhoto(pid);
    }
  }

  function build(now: Date): Measurement {
    const value = (k: ApplyKey): MeasuredValue | null => {
      const p = parsed[k];
      if (!p?.ok) return null;
      const d = dims[k];
      return d.photo ? { mm: p.mm, origin: d.origin, photo: d.photo } : { mm: p.mm, origin: d.origin };
    };
    return {
      id: existing?.id ?? newId('m', now),
      spaceId: space!.id,
      name: finalName,
      kind,
      width: value('width'),
      depth: value('depth'),
      height: value('height'),
      frontSpace: value('frontSpace'),
      measuredOn: measuredOn || null,
      photoIds,
      note: note.trim(),
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
  }

  async function save() {
    setTried(true);
    if (busy || hasError) return;
    setBusy(true);
    const now = new Date();
    let limit = false;
    const ok = await commit((s) => {
      try {
        return upsertMeasurement(s, build(now), now);
      } catch (e) {
        limit = e instanceof LimitError;
        throw e;
      }
    });
    setBusy(false);
    if (!ok) {
      toast(limit ? `한 공간에 측정 대상은 ${LIMITS.measurementsPerSpace}개까지 만들 수 있어요` : '저장하지 못했어요. 다시 시도해 주세요');
      return;
    }
    saved.current = true;
    toast(existing ? '측정 기록을 고쳤어요' : '측정 기록을 저장했어요');
    navigate(`/space/${space!.id}`, { replace: true });
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({ title: `'${existing.name}' 기록을 삭제할까요?`, message: '연결된 사진도 함께 삭제돼요. 지난 비교 기록은 남아요.', confirmText: '삭제', danger: true });
    if (!yes) return;
    const ok = await commit((s) => deleteMeasurement(s, existing.id));
    toast(ok ? '측정 기록을 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
    if (ok) {
      saved.current = true;
      navigate(`/space/${space!.id}`, { replace: true });
    }
  }

  async function duplicate() {
    if (!existing) return;
    const ok = await commit((s) => duplicateMeasurement(s, existing.id));
    toast(ok ? '복사본을 만들었어요(사진 제외)' : '복사하지 못했어요');
    if (ok) navigate(`/space/${space!.id}`, { replace: true });
  }

  const checklist = TARGET_CHECKLIST[kind];

  return (
    <Screen
      footer={
        <Button onClick={save} disabled={busy}>
          저장하기
        </Button>
      }
    >
      <Header title={existing ? '측정 기록' : '측정 대상 추가'} />
      <p className="hint">{space.name}</p>

      <Field label="무엇을 놓을 자리인가요?">
        <ChipGroup label="측정 대상 종류" value={kind} options={KINDS.map((k) => ({ value: k, label: TARGET_LABEL[k] }))} onChange={setKind} />
      </Field>
      <Field label="이름">
        <input className="input" value={name} maxLength={LIMITS.name} placeholder={TARGET_LABEL[kind]} onChange={(e) => setName(e.target.value)} />
      </Field>

      {checklist && (
        <Notice icon="list">
          <strong>재 두면 좋은 곳</strong>
          <ul className="checklist">
            {checklist.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Notice>
      )}

      <SectionTitle>치수 ({unit})</SectionTitle>
      <p className="hint">필요한 값만 입력해도 돼요. 비워 둔 값은 비교할 때 ‘추가 확인 필요’로 보여요.</p>
      {KEYS.map((k) => {
        const d = dims[k];
        return (
          <div key={k} className="dim-block">
            <Field label={KEY_LABEL[k]} hint={KEY_HINT[k]} error={tried || d.text ? errors[k] : null}>
              <div className="dim-row">
                <LengthInput label={KEY_LABEL[k]} value={d.text} onChange={(v) => setText(k, v)} unit={unit} />
                {photoIds.length > 0 && (
                  <button type="button" className="chip" onClick={() => setMeasuring({ photoId: photoIds[0], key: k })}>
                    <Icon name="camera" size={16} /> 사진으로
                  </button>
                )}
              </div>
            </Field>
            {d.text.trim() && (
              <div className="dim-origin">
                {d.origin === 'PHOTO' ? (
                  <span className="hint">
                    <OriginBadge origin="PHOTO" /> 줄자로 한 번 더 확인해 주세요
                  </span>
                ) : (
                  <ChipGroup label={`${KEY_LABEL[k]} 출처`} value={d.origin} options={ORIGIN_OPTIONS} onChange={(o) => setDims((x) => ({ ...x, [k]: { ...x[k], origin: o } }))} />
                )}
                {d.photo && d.origin !== 'PHOTO' && <span className="hint">사진 계산값 {formatLength(d.photo.computedMm, unit)}에서 직접 고친 값</span>}
              </div>
            )}
          </div>
        );
      })}

      <Field label="측정한 날">
        <input className="input" type="date" value={measuredOn} max={today()} onChange={(e) => setMeasuredOn(e.target.value)} />
      </Field>

      <SectionTitle>
        사진 <span className="muted">{photoIds.length}/{LIMITS.photosPerMeasurement}</span>
      </SectionTitle>
      <p className="hint">사진은 이 기기에만 저장되고 서버로 보내지 않아요. 사진을 누르면 기준 길이로 치수를 보조 측정할 수 있어요.</p>
      <div className="photo-grid">
        {photoIds.map((pid) => (
          <PhotoTile key={pid} id={pid} onOpen={() => setMeasuring({ photoId: pid, key: 'width' })} onRemove={() => removePhoto(pid)} />
        ))}
      </div>
      {photoIds.length < LIMITS.photosPerMeasurement && (
        <div className="btn-pair">
          <Button variant="soft" icon="camera" onClick={() => addPhoto('camera')}>
            사진 찍기
          </Button>
          <Button variant="soft" icon="image" onClick={() => addPhoto('album')}>
            앨범에서
          </Button>
        </div>
      )}

      <Field label="메모 (선택)">
        <textarea className="input" value={note} maxLength={LIMITS.note} placeholder="예: 오른쪽 벽에 콘센트, 배수구 뒤쪽" onChange={(e) => setNote(e.target.value)} />
      </Field>

      {existing && (
        <>
          <Button variant="soft" icon="scale" onClick={() => navigate(`/compare?m=${existing.id}`)}>
            이 자리로 제품 비교
          </Button>
          <div className="btn-pair">
            <Button variant="ghost" icon="copy" onClick={duplicate}>
              복사
            </Button>
            <Button variant="ghost" icon="trash" onClick={remove}>
              삭제
            </Button>
          </div>
        </>
      )}

      {measuring && (
        <PhotoMeasure photoId={measuring.photoId} unit={unit} initialKey={measuring.key} onApply={applyPhoto} onClose={() => setMeasuring(null)} />
      )}
    </Screen>
  );
}

function PhotoTile({ id, onOpen, onRemove }: { id: string; onOpen: () => void; onRemove: () => void }) {
  const uri = usePhoto(id);
  return (
    <div className="photo-tile">
      <button type="button" className="photo-open" aria-label="이 사진으로 보조 측정" onClick={onOpen}>
        {uri ? <img src={uri} alt="측정 사진" /> : <span className="hint">불러오지 못함</span>}
      </button>
      <button type="button" className="photo-remove" aria-label="사진 빼기" onClick={onRemove}>
        <Icon name="x" size={14} stroke={2.6} />
      </button>
    </div>
  );
}

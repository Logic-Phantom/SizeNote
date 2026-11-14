// 제품 목록 + 제품 등록·수정. 사용자가 직접 입력한 제원만 쓴다(제품 DB·크롤링·최저가 없음).
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChipGroup, ClearanceInput, Field, LengthInput, type ClearanceMode } from '../components/forms';
import { Icon } from '../components/Icon';
import { useOverlay } from '../components/overlay';
import { Button, Card, Empty, Header, Notice, Screen, SectionTitle } from '../components/ui';
import { PRODUCT_LABEL, SPEC_SOURCE_LABEL } from '../domain/catalog';
import { deleteProduct, LimitError, newId, upsertProduct } from '../domain/records';
import { DIM_KEYS, LIMITS, type Clearance, type Dims, type DimKey, type Product, type ProductCategory, type SpecSource } from '../domain/types';
import { CLEARANCE_MAX_MM, formatLength, parseLength, toInputText, type ParseResult, type Unit } from '../domain/units';
import { useApp } from '../state/store';
import { CLEARANCE_TEXT, DIM_LABEL, parseError } from './labels';

const CATEGORIES = Object.keys(PRODUCT_LABEL) as ProductCategory[];
const SOURCES = Object.keys(SPEC_SOURCE_LABEL) as SpecSource[];
const CLEARANCE_KEYS: (keyof Clearance)[] = ['left', 'right', 'rear', 'top'];

export function ProductList() {
  const { state } = useApp();
  const navigate = useNavigate();
  const unit = state.displayUnit;
  const list = [...state.products].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <Screen footer={<Button onClick={() => navigate('/product/new')}>제품 추가하기</Button>}>
      <Header title="사려는 제품" />
      {list.length === 0 ? (
        <Empty icon="box" title="아직 등록한 제품이 없어요" desc={'제품 설명서나 제조사 페이지에서 확인한\n크기와 설치 여유를 입력해 주세요.'} />
      ) : (
        list.map((p) => (
          <Card key={p.id} onClick={() => navigate(`/product/${p.id}`)} label={`${p.name} 제품`}>
            <div className="space-icon">
              <Icon name="box" />
            </div>
            <div className="card-main">
              <span className="card-title">{p.name}</span>
              <span className="card-sub">{dimsText(p.size, unit)}</span>
              <span className="card-sub">
                {PRODUCT_LABEL[p.category]}
                {p.model && ` · ${p.model}`} · {SPEC_SOURCE_LABEL[p.source]}
              </span>
            </div>
            <Icon name="chevron-right" size={18} color="var(--c-text-4)" />
          </Card>
        ))
      )}
    </Screen>
  );
}

export function dimsText(d: Dims, unit: Unit): string {
  return DIM_KEYS.map((k) => `${DIM_LABEL[k]} ${formatLength(d[k], unit)}`).join(' · ');
}

type DimTexts = Record<DimKey, string>;
const toTexts = (d: Dims | null | undefined, unit: Unit): DimTexts => ({
  width: toInputText(d?.width, unit),
  depth: toInputText(d?.depth, unit),
  height: toInputText(d?.height, unit),
});

interface ClearDraft {
  mode: ClearanceMode;
  text: string;
}
const toClear = (v: number | null | undefined, unit: Unit): ClearDraft =>
  v == null ? { mode: 'UNKNOWN', text: '' } : v === 0 ? { mode: 'NONE', text: '' } : { mode: 'VALUE', text: toInputText(v, unit) };

function parseOpt(text: string, unit: Unit): ParseResult | null {
  return text.trim() ? parseLength(text, unit) : null;
}
function parseClear(c: ClearDraft, unit: Unit): { mm: number | null; error: string | null } {
  if (c.mode === 'UNKNOWN') return { mm: null, error: null };
  if (c.mode === 'NONE') return { mm: 0, error: null };
  const r = parseLength(c.text, unit, { allowZero: true, maxMm: CLEARANCE_MAX_MM });
  return r.ok ? { mm: r.mm, error: null } : { mm: null, error: r.reason === 'empty' ? '값을 입력하거나 ‘확인 안 함’을 골라 주세요' : parseError(r, { allowZero: true }) };
}

export function ProductEditor() {
  const { id } = useParams();
  const { state, commit } = useApp();
  const { toast, confirm } = useOverlay();
  const navigate = useNavigate();
  const unit = state.displayUnit;
  const existing = id ? state.products.find((p) => p.id === id) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<ProductCategory>(existing?.category ?? 'FRIDGE');
  const [maker, setMaker] = useState(existing?.maker ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [size, setSize] = useState<DimTexts>(toTexts(existing?.size, unit));
  const [hasPackage, setHasPackage] = useState(existing?.packageSize != null);
  const [pkg, setPkg] = useState<DimTexts>(toTexts(existing?.packageSize, unit));
  const [clear, setClear] = useState<Record<keyof Clearance, ClearDraft>>(() => ({
    left: toClear(existing?.clearance.left, unit),
    right: toClear(existing?.clearance.right, unit),
    rear: toClear(existing?.clearance.rear, unit),
    top: toClear(existing?.clearance.top, unit),
  }));
  const [door, setDoor] = useState<ClearDraft>(toClear(existing?.doorOpenMm, unit));
  const [source, setSource] = useState<SpecSource>(existing?.source ?? 'MANUAL_DOC');
  const [sourceUrl, setSourceUrl] = useState(existing?.sourceUrl ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);

  if (id && !existing) {
    return (
      <Screen>
        <Header title="제품" />
        <Notice tone="warn" icon="alert">
          삭제되었거나 찾을 수 없는 제품이에요.
        </Notice>
      </Screen>
    );
  }

  const sizeParsed = Object.fromEntries(DIM_KEYS.map((k) => [k, parseOpt(size[k], unit)])) as Record<DimKey, ParseResult | null>;
  const pkgParsed = Object.fromEntries(DIM_KEYS.map((k) => [k, parseOpt(pkg[k], unit)])) as Record<DimKey, ParseResult | null>;
  const clearParsed = Object.fromEntries(CLEARANCE_KEYS.map((k) => [k, parseClear(clear[k], unit)])) as Record<keyof Clearance, { mm: number | null; error: string | null }>;
  const doorParsed = parseClear(door, unit);
  const err = (r: ParseResult | null) => (r ? parseError(r) : null);
  const hasError =
    !name.trim() ||
    DIM_KEYS.some((k) => err(sizeParsed[k]) || (hasPackage && err(pkgParsed[k]))) ||
    CLEARANCE_KEYS.some((k) => clearParsed[k].error) ||
    !!doorParsed.error;
  const mm = (r: ParseResult | null) => (r?.ok ? r.mm : null);

  async function save() {
    setTried(true);
    if (busy || hasError) return;
    setBusy(true);
    const now = new Date();
    const product: Product = {
      id: existing?.id ?? newId('p', now),
      name: name.trim(),
      category,
      maker: maker.trim(),
      model: model.trim(),
      size: { width: mm(sizeParsed.width), depth: mm(sizeParsed.depth), height: mm(sizeParsed.height) },
      packageSize: hasPackage ? { width: mm(pkgParsed.width), depth: mm(pkgParsed.depth), height: mm(pkgParsed.height) } : null,
      clearance: { left: clearParsed.left.mm, right: clearParsed.right.mm, rear: clearParsed.rear.mm, top: clearParsed.top.mm },
      doorOpenMm: doorParsed.mm,
      source,
      sourceUrl: sourceUrl.trim(),
      note: note.trim(),
      createdAt: existing?.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
    };
    let limit = false;
    const ok = await commit((s) => {
      try {
        return upsertProduct(s, product, now);
      } catch (e) {
        limit = e instanceof LimitError;
        throw e;
      }
    });
    setBusy(false);
    if (!ok) {
      toast(limit ? `제품은 ${LIMITS.products}개까지 등록할 수 있어요` : '저장하지 못했어요. 다시 시도해 주세요');
      return;
    }
    toast(existing ? '제품 정보를 고쳤어요' : '제품을 등록했어요');
    navigate(-1);
  }

  async function remove() {
    if (!existing) return;
    const yes = await confirm({ title: `'${existing.name}'을(를) 삭제할까요?`, message: '지난 비교 기록은 남아요.', confirmText: '삭제', danger: true });
    if (!yes) return;
    const ok = await commit((s) => deleteProduct(s, existing.id));
    toast(ok ? '제품을 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
    if (ok) navigate('/products', { replace: true });
  }

  const dimInputs = (texts: DimTexts, set: (t: DimTexts) => void, parsed: Record<DimKey, ParseResult | null>, prefix: string) =>
    DIM_KEYS.map((k) => (
      <Field key={k} label={`${prefix}${DIM_LABEL[k]}`} error={tried || texts[k] ? err(parsed[k]) : null}>
        <LengthInput label={`${prefix}${DIM_LABEL[k]}`} value={texts[k]} onChange={(v) => set({ ...texts, [k]: v })} unit={unit} />
      </Field>
    ));

  return (
    <Screen
      footer={
        <Button onClick={save} disabled={busy}>
          저장하기
        </Button>
      }
    >
      <Header title={existing ? '제품 정보' : '제품 추가'} />

      <Field label="제품 이름" error={tried && !name.trim() ? '제품 이름을 입력해 주세요' : null}>
        <input className="input" value={name} maxLength={LIMITS.name} placeholder="예: 양문형 냉장고 후보 A" onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="분류">
        <ChipGroup label="제품 분류" value={category} options={CATEGORIES.map((c) => ({ value: c, label: PRODUCT_LABEL[c] }))} onChange={setCategory} />
      </Field>
      <div className="two-col">
        <Field label="제조사 (선택)">
          <input className="input" value={maker} maxLength={LIMITS.name} onChange={(e) => setMaker(e.target.value)} />
        </Field>
        <Field label="모델명 (선택)">
          <input className="input" value={model} maxLength={LIMITS.name} onChange={(e) => setModel(e.target.value)} />
        </Field>
      </div>

      <SectionTitle>본체 크기 ({unit})</SectionTitle>
      <p className="hint">손잡이·다리 등 튀어나온 부분을 포함한 외형 크기예요. 정면 기준 가로·깊이·높이로 입력해 주세요.</p>
      {dimInputs(size, setSize, sizeParsed, '')}

      <SectionTitle>제조사 권장 설치 여유</SectionTitle>
      <p className="hint">제품 설명서에 적힌 설치 간격을 입력해 주세요. 모르면 ‘확인 안 함’으로 두면 비교 결과가 ‘추가 확인 필요’로 나와요.</p>
      {CLEARANCE_KEYS.map((k) => (
        <ClearanceInput
          key={k}
          label={CLEARANCE_TEXT[k]}
          mode={clear[k].mode}
          value={clear[k].text}
          unit={unit}
          onMode={(m) => setClear((c) => ({ ...c, [k]: { ...c[k], mode: m } }))}
          onValue={(v) => setClear((c) => ({ ...c, [k]: { ...c[k], text: v } }))}
          error={tried ? clearParsed[k].error : null}
        />
      ))}
      <ClearanceInput
        label="문·서랍 여는 공간(앞쪽)"
        mode={door.mode}
        value={door.text}
        unit={unit}
        onMode={(m) => setDoor((d) => ({ ...d, mode: m }))}
        onValue={(v) => setDoor((d) => ({ ...d, text: v }))}
        error={tried ? doorParsed.error : null}
      />

      <SectionTitle>
        포장 크기 <span className="muted">(반입 경로용, 선택)</span>
      </SectionTitle>
      <ChipGroup
        label="포장 크기 입력"
        value={hasPackage ? 'Y' : 'N'}
        options={[
          { value: 'N', label: '입력 안 함' },
          { value: 'Y', label: '입력하기' },
        ]}
        onChange={(v) => setHasPackage(v === 'Y')}
      />
      {hasPackage && dimInputs(pkg, setPkg, pkgParsed, '포장 ')}

      <SectionTitle>제원 출처</SectionTitle>
      <ChipGroup label="제원 출처" value={source} options={SOURCES.map((s) => ({ value: s, label: SPEC_SOURCE_LABEL[s] }))} onChange={setSource} />
      <Field label="참고 주소 (선택)" hint="기록용이에요. 앱이 이 주소를 열거나 정보를 가져오지 않아요.">
        <input className="input" type="url" inputMode="url" value={sourceUrl} maxLength={LIMITS.url} onChange={(e) => setSourceUrl(e.target.value)} />
      </Field>
      <Field label="메모 (선택)">
        <textarea className="input" value={note} maxLength={LIMITS.note} placeholder="예: 뒷면 환기구, 직렬 설치 키트 필요" onChange={(e) => setNote(e.target.value)} />
      </Field>

      {existing && (
        <Button variant="ghost" icon="trash" onClick={remove}>
          제품 삭제
        </Button>
      )}
    </Screen>
  );
}

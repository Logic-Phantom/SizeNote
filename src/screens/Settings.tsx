// 설정: 표시 단위, 데이터 저장 안내, 전체 삭제(이 앱 키만), 앱 정보.
import { useOverlay } from '../components/overlay';
import { Header, Notice, Row, Screen, SectionTitle } from '../components/ui';
import { useApp } from '../state/store';

export function Settings() {
  const { state, commit, wipe } = useApp();
  const { confirm, toast } = useOverlay();

  async function toggleUnit() {
    const next = state.displayUnit === 'cm' ? 'mm' : 'cm';
    const ok = await commit((s) => ({ ...s, displayUnit: next }));
    if (!ok) toast('저장하지 못했어요. 다시 시도해 주세요');
  }

  async function wipeAll() {
    const yes = await confirm({
      title: '모든 데이터를 삭제할까요?',
      message: '공간·측정 항목·사진·제품·비교 기록이 모두 지워지고 되돌릴 수 없어요.',
      confirmText: '모두 삭제',
      danger: true,
    });
    if (!yes) return;
    toast((await wipe()) ? '모든 데이터를 삭제했어요' : '삭제하지 못했어요. 다시 시도해 주세요');
  }

  return (
    <Screen tabbar>
      <Header title="설정" back={false} />
      <div className="rows">
        <Row icon="ruler" label="표시 단위" value={state.displayUnit === 'cm' ? 'cm' : 'mm'} onClick={toggleUnit} />
      </div>

      <SectionTitle>데이터</SectionTitle>
      <Notice>
        모든 기록은 서버로 보내지 않고 이 기기의 토스 앱 안에만 저장돼요. 앱을 지우거나 기기를 바꾸면 사라질 수 있어요.
      </Notice>
      <div className="rows">
        <Row icon="trash" label="모든 데이터 삭제" onClick={wipeAll} danger />
      </div>

      <SectionTitle>앱 정보</SectionTitle>
      <div className="rows">
        <Row icon="info" label="버전" value={__APP_VERSION__} />
      </div>
      <p className="hint">
        비교 결과는 입력한 치수 기준의 참고 정보예요. 실제 설치·반입 가능 여부는 제품 설명서와 판매처·설치 기사님께 확인해 주세요.
      </p>
    </Screen>
  );
}

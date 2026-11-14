// 설정: 표시 단위, 데이터 저장 안내·전체 삭제(이 앱 키만), 앱 정보·측정 가이드·약관·개인정보·오픈소스·고객센터.
// 문서 화면은 내 차 어딨지 Settings.tsx와 같은 구조(서버 없음 → 앱 안 문구로 제공).
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useOverlay } from '../components/overlay';
import { Header, Notice, Row, Screen, SectionTitle } from '../components/ui';
import { LIMITS } from '../domain/types';
import licenses from '../legal/oss-licenses.json';
import { useApp } from '../state/store';

const EFFECTIVE = '2026년 11월 14일';

export function Settings() {
  const { state, commit, wipe } = useApp();
  const { confirm, toast } = useOverlay();
  const navigate = useNavigate();

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
      <Notice>모든 기록은 서버로 보내지 않고 이 기기의 토스 앱 안에만 저장돼요. 앱을 지우거나 기기를 바꾸면 사라질 수 있어요.</Notice>
      <div className="rows">
        <Row icon="trash" label="모든 데이터 삭제" onClick={wipeAll} danger />
      </div>

      <SectionTitle>정보</SectionTitle>
      <div className="rows">
        <Row icon="info" label="앱 정보" onClick={() => navigate('/settings/about')} />
        <Row icon="ruler" label="측정 가이드" onClick={() => navigate('/settings/guide')} />
        <Row icon="help" label="고객센터" onClick={() => navigate('/settings/support')} />
        <Row icon="doc" label="이용약관" onClick={() => navigate('/settings/terms')} />
        <Row icon="lock" label="개인정보 처리방침" onClick={() => navigate('/settings/privacy')} />
        <Row icon="list" label="오픈소스 라이선스" onClick={() => navigate('/settings/licenses')} />
      </div>
      <p className="hint">버전 {__APP_VERSION__}</p>
    </Screen>
  );
}

const TITLES: Record<string, string> = {
  about: '앱 정보',
  guide: '측정 가이드',
  support: '고객센터',
  terms: '이용약관',
  privacy: '개인정보 처리방침',
  licenses: '오픈소스 라이선스',
};

export function SettingsPage() {
  const { page = '' } = useParams();
  if (!TITLES[page]) return <Navigate to="/settings" replace />;
  return (
    <Screen>
      <Header title={TITLES[page]} />
      <article className="doc">
        {page === 'about' && <About />}
        {page === 'guide' && <Guide />}
        {page === 'support' && <Support />}
        {page === 'terms' && <Terms />}
        {page === 'privacy' && <Privacy />}
        {page === 'licenses' && <Licenses />}
      </article>
    </Screen>
  );
}

function About() {
  return (
    <>
      <h2>사이즈 어때?</h2>
      <p>사기 전에, 우리 집에 맞는지. 우리 집 공간 치수를 저장해 두고, 사려는 가구·가전이 설치 자리와 반입 경로에 맞는지 비교해요.</p>
      <h2>이렇게 동작해요</h2>
      <ul>
        <li>치수는 직접 입력하거나, 사진 위에 기준 길이(줄자·A4 용지)를 표시해 참고값을 계산할 수 있어요.</li>
        <li>제품 크기에 제조사 권장 설치 여유를 더해 방향별로 비교해요. 확인하지 않은 값은 0으로 보지 않고 ‘추가 확인 필요’로 알려 드려요.</li>
        <li>결과는 입력한 값 기준의 참고 정보예요. 실제 설치·반입 가능 여부를 보증하지 않아요.</li>
        <li>회원가입·로그인이 없고, 모든 기록은 이 기기에만 저장돼요.</li>
      </ul>
      <p className="muted">버전 {__APP_VERSION__}</p>
    </>
  );
}

function Guide() {
  return (
    <>
      <h2>방향 정하기</h2>
      <ul>
        <li>
          <strong>가로</strong>: 정면에서 봤을 때 좌우
        </li>
        <li>
          <strong>깊이</strong>: 정면에서 뒤쪽 벽까지
        </li>
        <li>
          <strong>높이</strong>: 바닥에서 위쪽까지
        </li>
      </ul>
      <p>공간과 제품을 같은 정면 기준으로 재야 비교가 정확해요.</p>
      <h2>공간 잴 때</h2>
      <ul>
        <li>방 전체가 아니라 제품이 실제로 들어갈 자리를 재요.</li>
        <li>걸레받이·몰딩·배관·콘센트·문틀처럼 튀어나온 부분을 뺀 가장 좁은 곳을 기준으로 해요.</li>
        <li>문·서랍을 열 공간이 필요한 제품이면 자리 앞쪽 빈 거리도 재 두세요.</li>
      </ul>
      <h2>제품 크기 확인할 때</h2>
      <ul>
        <li>제품 설명서나 제조사 공식 페이지의 외형 크기(손잡이·다리 포함)를 입력해요.</li>
        <li>설명서에 적힌 설치 간격(좌·우·뒤·위)도 함께 입력해요. 모르면 ‘확인 안 함’으로 두세요.</li>
        <li>반입 경로를 볼 때는 포장 크기가 본체보다 커요. 포장 크기를 따로 입력해 주세요.</li>
      </ul>
      <h2>사진으로 잴 때</h2>
      <ul>
        <li>줄자·자·A4 용지를 잴 부분과 같은 면에 두고 정면에서 찍어요.</li>
        <li>기준물이 사진에서 크게 보일수록 오차가 줄어요. 확대 버튼으로 끝점을 정확히 눌러 주세요.</li>
        <li>사진으로 계산한 값은 참고값이에요. 구매 전에는 줄자로 한 번 더 확인해 주세요.</li>
        <li>사진에서 보이지 않는 깊이·뒤쪽은 잴 수 없어요.</li>
      </ul>
    </>
  );
}

function Support() {
  return (
    <>
      <h2>자주 묻는 질문</h2>
      <p>
        <strong>‘추가 확인 필요’가 나와요.</strong>
        <br />
        비교에 필요한 치수나 제조사 설치 여유를 입력하지 않았을 때 나와요. 결과 화면에 빠진 항목이 표시돼요. 설치 여유가 필요 없다면 ‘필요 없음’을 골라 주세요.
      </p>
      <p>
        <strong>‘입력값 기준 규격 충족’이면 설치할 수 있나요?</strong>
        <br />
        입력한 치수끼리 단순 비교한 결과예요. 환기·배관·전원 위치, 바닥 수평 같은 현장 조건은 판단하지 않아요. 판매처·설치 기사님께 꼭 확인해 주세요.
      </p>
      <p>
        <strong>사진으로 잰 값이 실제와 달라요.</strong>
        <br />
        기울어진 사진, 기준물과 다른 깊이에 있는 부분은 오차가 커요. 정면에서 다시 찍거나 줄자로 잰 값으로 고쳐 주세요.
      </p>
      <p>
        <strong>기록이 사라졌어요.</strong>
        <br />
        기록은 기기에만 저장돼요. 기기 변경·토스 앱 데이터 삭제 시 복구할 수 없어요.
      </p>
      <h2>문의하기</h2>
      <p>토스 앱에서 이 미니앱의 정보 화면에 있는 문의 채널로 연락해 주세요.</p>
    </>
  );
}

function Terms() {
  return (
    <>
      <h2>제1조 (목적)</h2>
      <p>이 약관은 ‘사이즈 어때?’(이하 ‘서비스’)의 이용 조건을 정해요. 서비스는 토스 앱 안에서 제공되는 공간 치수 기록·비교 도구예요.</p>
      <h2>제2조 (서비스 내용)</h2>
      <p>서비스는 공간·측정 대상 치수와 사진 기록, 사진 기준 길이를 이용한 참고 치수 계산, 사용자가 입력한 제품 크기와의 비교, 반입 경로 단순 비교, 비교 기록 보관을 제공해요. 회원가입과 로그인이 필요 없어요.</p>
      <h2>제3조 (비교 결과의 한계)</h2>
      <p>비교 결과는 사용자가 입력한 값끼리의 단순 비교이며 실제 설치·반입 가능 여부를 보증하지 않아요. 사진으로 계산한 치수는 원근·렌즈 왜곡을 보정하지 않은 참고값이에요. 서비스는 제품 판매·배송·설치를 하지 않아요.</p>
      <h2>제4조 (데이터 보관)</h2>
      <p>기록은 사용자 기기에만 저장돼요. 기기 변경, 앱 삭제, 데이터 초기화 시 복구할 수 없어요. 서비스는 서버에 기록을 백업하지 않아요.</p>
      <h2>제5조 (책임의 제한)</h2>
      <p>서비스는 기록과 비교를 돕는 도구로, 사용자가 입력한 정보의 정확성, 비교 결과와 실제 현장의 차이, 기록 유실로 생긴 손해에 대해 고의 또는 중대한 과실이 없는 한 책임지지 않아요.</p>
      <p className="muted">시행일: {EFFECTIVE}</p>
    </>
  );
}

function Privacy() {
  return (
    <>
      <p>‘사이즈 어때?’는 개인정보를 서버로 수집하지 않아요. 아래 정보는 사용자의 기기 안(토스 앱의 미니앱 저장소)에만 저장돼요.</p>
      <h2>기기에 저장하는 정보</h2>
      <ul>
        <li>공간 이름·종류·메모, 측정 대상 치수·출처·측정일·메모</li>
        <li>측정 사진: ‘사진 찍기’ 또는 ‘앨범에서’를 눌렀을 때만 가져오고, 측정 대상마다 {LIMITS.photosPerMeasurement}장까지 줄여서 저장</li>
        <li>사진 보조 측정 기록(기준선·측정선 위치, 기준 길이)</li>
        <li>제품 이름·크기·설치 여유·메모·참고 주소, 반입 경로 치수, 비교 기록(최근 {LIMITS.comparisons}개)</li>
      </ul>
      <p>집 주소, 위치, 이름, 연락처는 받지 않아요.</p>
      <h2>외부 전송</h2>
      <p>위 정보와 사진은 외부 서버로 보내지 않아요. 사진 측정 계산도 기기 안에서만 해요. 참고 주소는 기록용이며 앱이 열거나 접속하지 않아요.</p>
      <h2>권한</h2>
      <ul>
        <li>카메라: 측정할 자리 사진 촬영(선택, 거부해도 직접 입력으로 이용 가능)</li>
        <li>사진: 앨범에서 측정 사진 선택(선택, 거부해도 직접 입력으로 이용 가능)</li>
      </ul>
      <h2>보관과 삭제</h2>
      <p>설정 &gt; 모든 데이터 삭제로 언제든 전부 지울 수 있고, 토스 앱에서 미니앱 데이터를 지워도 삭제돼요.</p>
      <h2>문의</h2>
      <p>앱인토스에 등록된 문의 채널(토스 앱 &gt; 미니앱 정보)로 연락해 주세요.</p>
      <p className="muted">시행일: {EFFECTIVE}</p>
    </>
  );
}

function Licenses() {
  const list = (licenses as { packages?: { name: string; version: string; license: string }[] }).packages ?? [];
  return (
    <>
      <p>이 앱은 다음 오픈소스 소프트웨어를 사용해요.</p>
      <ul className="license-list">
        {list.map((p) => (
          <li key={`${p.name}@${p.version}`}>
            <strong>{p.name}</strong> <span className="muted">{p.version} · {p.license}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

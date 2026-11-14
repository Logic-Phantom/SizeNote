// 해시 라우팅: 앱인토스는 dist 정적 파일을 그대로 열기 때문에 서버 경로 재작성에 기대지 않는다.
// 화면: 홈 → 공간 상세 → 측정 대상(사진 보조 측정 포함) / 제품 / 비교·후보 3개 / 비교 기록 / 반입 경로 / 설정
import { Component, useEffect, type ReactNode } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { OverlayProvider, useOverlay } from './components/overlay';
import { Compare } from './screens/Compare';
import { History } from './screens/History';
import { HistoryDetail } from './screens/HistoryDetail';
import { Home } from './screens/Home';
import { MeasurementEditor } from './screens/MeasurementEditor';
import { PassageEditor, PassageList } from './screens/Passages';
import { ProductEditor, ProductList } from './screens/Products';
import { Settings, SettingsPage } from './screens/Settings';
import { SpaceDetail } from './screens/SpaceDetail';
import { SpaceEditor } from './screens/SpaceEditor';
import { AppProvider, useApp } from './state/store';

function Shell() {
  const { ready, corrupted, dismissCorrupted } = useApp();
  const { toast } = useOverlay();
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    if (corrupted) {
      toast('저장된 기록을 읽지 못해 새로 시작해요');
      dismissCorrupted();
    }
  }, [corrupted, toast, dismissCorrupted]);
  if (!ready) return <div className="boot" aria-busy="true" />;
  return <Outlet />;
}

const router = createHashRouter([
  {
    element: <Shell />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/space/new', element: <SpaceEditor /> },
      { path: '/space/:id', element: <SpaceDetail /> },
      { path: '/space/:id/edit', element: <SpaceEditor /> },
      { path: '/space/:spaceId/measure/new', element: <MeasurementEditor /> },
      { path: '/measure/:id', element: <MeasurementEditor /> },
      { path: '/products', element: <ProductList /> },
      { path: '/product/new', element: <ProductEditor /> },
      { path: '/product/:id', element: <ProductEditor /> },
      { path: '/compare', element: <Compare /> },
      { path: '/history', element: <History /> },
      { path: '/history/:id', element: <HistoryDetail /> },
      { path: '/passages', element: <PassageList /> },
      { path: '/passage/new', element: <PassageEditor /> },
      { path: '/passage/:id', element: <PassageEditor /> },
      { path: '/settings', element: <Settings /> },
      { path: '/settings/:page', element: <SettingsPage /> },
      { path: '*', element: <Home /> },
    ],
  },
]);

/** 화면 렌더 오류 시 흰 화면 대신 안내를 보여 준다(내부 오류 메시지는 노출하지 않음) */
class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen">
        <main className="screen-body crash">
          <h1>화면을 불러오지 못했어요</h1>
          <p>저장된 기록은 그대로 있어요. 다시 열어 주세요.</p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              location.hash = '#/';
              location.reload();
            }}
          >
            처음 화면으로
          </button>
        </main>
      </div>
    );
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <OverlayProvider>
          <RouterProvider router={router} />
        </OverlayProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

// 해시 라우팅: 앱인토스는 dist 정적 파일을 그대로 열기 때문에 서버 경로 재작성에 기대지 않는다.
// 현재 화면: 홈 · 공간 추가/수정 · 비교 기록 · 설정. 측정 항목·제품·비교·사진 측정 화면은 README '다음 할 일' 참고.
import { useEffect } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';
import { OverlayProvider, useOverlay } from './components/overlay';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Settings } from './screens/Settings';
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
      { path: '/space/:id/edit', element: <SpaceEditor /> },
      { path: '/history', element: <History /> },
      { path: '/settings', element: <Settings /> },
      { path: '*', element: <Home /> },
    ],
  },
]);

export function App() {
  return (
    <AppProvider>
      <OverlayProvider>
        <RouterProvider router={router} />
      </OverlayProvider>
    </AppProvider>
  );
}

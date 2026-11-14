// 직접 그린 선 아이콘(24×24, 외부 아이콘 라이브러리 없음). 내 차 어딨지 Icon.tsx에서 필요한 것만 가져오고 치수용 아이콘을 추가.
import type { CSSProperties } from 'react';

export type IconName =
  | 'home'
  | 'gear'
  | 'camera'
  | 'search'
  | 'chevron-right'
  | 'chevron-left'
  | 'info'
  | 'doc'
  | 'lock'
  | 'help'
  | 'trash'
  | 'copy'
  | 'edit'
  | 'x'
  | 'check'
  | 'plus'
  | 'alert'
  | 'image'
  | 'list'
  | 'ruler'
  | 'scale'
  | 'door'
  | 'box';

const P: Record<IconName, string> = {
  home: 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z',
  gear: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.4 7.4 0 0 1-2 1.2l-.3 2h-3.9l-.3-2a7.4 7.4 0 0 1-2-1.2l-1.9.7-2-3.4 1.6-1.2a7.6 7.6 0 0 1 0-2.4L2.7 9.9l2-3.4 1.9.7a7.4 7.4 0 0 1 2-1.2l.3-2h3.9l.3 2a7.4 7.4 0 0 1 2 1.2l1.9-.7 2 3.4-1.6 1.2a7.6 7.6 0 0 1 0 2.4z',
  camera: 'M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.5-2h5.6l1.5 2h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5zM12 16a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4z',
  list: 'M6 3.5h12a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1zM8.5 8.5h7M8.5 12h7M8.5 15.5h4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  'chevron-right': 'M9.5 6l6 6-6 6',
  'chevron-left': 'M14.5 6l-6 6 6 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.6v.01',
  doc: 'M7 3.5h7l4 4V20a.5.5 0 0 1-.5.5h-10A1.5 1.5 0 0 1 6 19V5a1.5 1.5 0 0 1 1-1.5zM9 12h6M9 15.5h6M13.5 3.5V8H18',
  lock: 'M6.5 10.5h11a1 1 0 0 1 1 1V19a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5a1 1 0 0 1 1-1zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14v2.5',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.01',
  trash: 'M4.5 7h15M10 7V5h4v2M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-12.5M10 11v6M14 11v6',
  copy: 'M9 9h10a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zM5 15H4.5a.5.5 0 0 1-.5-.5V5a1 1 0 0 1 1-1h9.5a.5.5 0 0 1 .5.5V5',
  edit: 'M14.5 5.5l4 4M4 20l1-4.5L15.5 5a1.4 1.4 0 0 1 2 0l1.5 1.5a1.4 1.4 0 0 1 0 2L8.5 19z',
  x: 'M6 6l12 12M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  alert: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17v.01',
  image: 'M4.5 5h15a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM3.5 16l5-5 4 4 2.5-2.5 5.5 5M15.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  ruler: 'M3.5 15.5 15.5 3.5l5 5-12 12zM7 12l1.8 1.8M9.5 9.5l2.5 2.5M12 7l1.8 1.8M14.5 4.5 17 7',
  scale: 'M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0zM12 4.5v.01',
  door: 'M6 20.5V4.5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v16M4 20.5h16M14.5 12.5v.01',
  box: 'M12 3.5 20 7.5v9L12 20.5 4 16.5v-9zM4 7.5l8 4 8-4M12 11.5v9',
};

export function Icon({ name, size = 22, stroke = 2, color, style }: { name: IconName; size?: number; stroke?: number; color?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0, color, ...style }}>
      <path d={P[name]} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

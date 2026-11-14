// 공통 UI: 화면 틀·헤더·탭바·버튼·카드·행·판정 배지·출처 배지·빈 상태.
import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ORIGIN_LABEL } from '../domain/catalog';
import type { FitStatus, ValueOrigin } from '../domain/types';
import { isInToss } from '../platform/toss';
import { Icon, type IconName } from './Icon';

export function Screen({ children, tabbar = false, footer }: { children: ReactNode; tabbar?: boolean; footer?: ReactNode }) {
  return (
    <div className={`screen${tabbar ? ' has-tabbar' : ''}${footer ? ' has-footer' : ''}`}>
      <main className="screen-body">{children}</main>
      {footer && <div className="screen-footer">{footer}</div>}
      {tabbar && <TabBar />}
    </div>
  );
}

/** 화면 제목 줄. 토스 안에서는 토스 내비게이션 바가 뒤로가기를 그리므로 화면 안 뒤로가기는 브라우저 미리보기에서만 보인다 */
export function Header({ title, right, back = true }: { title: ReactNode; right?: ReactNode; back?: boolean }) {
  const navigate = useNavigate();
  const showBack = back && !isInToss();
  return (
    <header className="header">
      <div className="header-side">
        {showBack && (
          <button className="icon-btn" aria-label="뒤로" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}>
            <Icon name="chevron-left" size={24} />
          </button>
        )}
      </div>
      <h1 className="header-title">{title}</h1>
      <div className="header-side header-right">{right}</div>
    </header>
  );
}

const TABS: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: '홈', icon: 'home' },
  { to: '/history', label: '비교', icon: 'scale' },
  { to: '/settings', label: '설정', icon: 'gear' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="주요 메뉴">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end replace className={({ isActive }) => `tab${isActive ? ' active' : ''}`}>
          <Icon name={t.icon} size={22} />
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  small,
  icon,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'soft' | 'ghost' | 'danger';
  disabled?: boolean;
  small?: boolean;
  icon?: IconName;
  type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`btn btn-${variant}${small ? ' btn-sm' : ''}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={small ? 18 : 20} />}
      {children}
    </button>
  );
}

export function Card({ children, className = '', onClick, label }: { children: ReactNode; className?: string; onClick?: () => void; label?: string }) {
  if (onClick) {
    return (
      <button type="button" className={`card card-btn ${className}`} onClick={onClick} aria-label={label}>
        {children}
      </button>
    );
  }
  return <div className={`card ${className}`}>{children}</div>;
}

export function Row({ icon, label, value, onClick, danger }: { icon?: IconName; label: ReactNode; value?: ReactNode; onClick?: () => void; danger?: boolean }) {
  const body = (
    <>
      {icon && <Icon name={icon} size={20} color={danger ? 'var(--c-danger)' : 'var(--c-text-2)'} />}
      <span className="row-label">{label}</span>
      {value != null && <span className="row-value">{value}</span>}
      {onClick && <Icon name="chevron-right" size={18} color="var(--c-text-4)" />}
    </>
  );
  return onClick ? (
    <button type="button" className={`row${danger ? ' row-danger' : ''}`} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className="row">{body}</div>
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {right}
    </div>
  );
}

export function Notice({ children, tone = 'info', icon = 'info' }: { children: ReactNode; tone?: 'info' | 'warn'; icon?: IconName }) {
  return (
    <div className={`notice notice-${tone}`}>
      <Icon name={icon} size={20} />
      <div>{children}</div>
    </div>
  );
}

export function Empty({ icon = 'ruler', title, desc, action }: { icon?: IconName; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon name={icon} size={30} color="var(--c-primary)" />
      </div>
      <p className="empty-title">{title}</p>
      {desc && <p className="empty-desc">{desc}</p>}
      {action}
    </div>
  );
}

/** 판정 문구는 과장하지 않는다: '설치 가능' 대신 '입력값 기준 규격 충족' */
export const STATUS_TEXT: Record<FitStatus, string> = {
  FIT: '입력값 기준 규격 충족',
  OVER: '규격 초과',
  REVIEW: '추가 확인 필요',
};
const STATUS_ICON: Record<FitStatus, IconName> = { FIT: 'check', OVER: 'x', REVIEW: 'help' };

export function StatusBadge({ status }: { status: FitStatus }) {
  return (
    <span className={`status status-${status.toLowerCase()}`}>
      <Icon name={STATUS_ICON[status]} size={16} stroke={2.4} />
      {STATUS_TEXT[status]}
    </span>
  );
}

export function OriginBadge({ origin }: { origin: ValueOrigin }) {
  return <span className={`origin origin-${origin.toLowerCase()}`}>{ORIGIN_LABEL[origin]}</span>;
}

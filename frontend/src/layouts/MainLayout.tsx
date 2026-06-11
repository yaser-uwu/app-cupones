import { NavLink, Outlet, useLocation } from 'react-router-dom';
import NotificationBell from '../components/NotificationBell';
import './MainLayout.css';

export default function MainLayout() {
  const location = useLocation();
  const isProfile = location.pathname === '/perfil';

  return (
    <div className="main-layout">
      <header className="app-header">
        <div className="app-header-row">
          <div className="app-brand">
            <span className="app-brand-icon">💝</span>
            <span className="app-brand-name">Cupones</span>
          </div>
          <NotificationBell />
        </div>

        <nav className="top-tabs" aria-label="Navegación principal">
          <NavLink to="/" className={({ isActive }) => `top-tab ${isActive ? 'active' : ''}`} end>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h10" strokeLinecap="round" />
            </svg>
            Cupones
          </NavLink>
          <NavLink to="/perfil" className={({ isActive }) => `top-tab ${isActive ? 'active' : ''}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
            </svg>
            Perfil
          </NavLink>
        </nav>
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <nav className="bottom-nav" aria-label="Navegación inferior">
        <div className="bottom-nav-inner">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            <span className="nav-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M7 9h4M7 13h6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="nav-label">Cupones</span>
          </NavLink>
          <NavLink to="/perfil" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" />
              </svg>
            </span>
            <span className="nav-label">Perfil</span>
          </NavLink>
        </div>
      </nav>

      <span className="sr-only" aria-live="polite">
        {isProfile ? 'Sección perfil' : 'Sección cupones'}
      </span>
    </div>
  );
}

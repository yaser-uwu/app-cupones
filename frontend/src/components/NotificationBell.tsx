import { useEffect, useRef, useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationBell.css';

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleOpen = () => setOpen((v) => !v);

  const handleRead = async (id: string) => {
    await markAsRead(id);
  };

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="bell-btn"
        onClick={handleOpen}
        aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" />
        </svg>
        {unreadCount > 0 && <span className="bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="bell-panel">
          <div className="bell-panel-header">
            <strong>Notificaciones</strong>
            {unreadCount > 0 && (
              <button type="button" className="bell-mark-all" onClick={markAllAsRead}>
                Marcar todas
              </button>
            )}
          </div>

          <div className="bell-list">
            {notifications.length === 0 ? (
              <p className="bell-empty">No hay notificaciones</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`bell-item ${n.readAt ? 'read' : 'unread'}`}
                  onClick={() => !n.readAt && handleRead(n.id)}
                >
                  <span className="bell-item-icon">
                    {n.type === 'coupon_redeemed' ? '✨' : '🎟️'}
                  </span>
                  <span className="bell-item-content">
                    <strong>{n.title}</strong>
                    <small>{n.body}</small>
                    <time>{new Date(n.createdAt).toLocaleString('es-ES')}</time>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

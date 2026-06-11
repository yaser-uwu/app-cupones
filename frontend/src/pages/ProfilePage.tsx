import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, type Profile } from '../lib/api';
import {
  isPushSupported,
  isPushSubscribed,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast, { type ToastType } from '../components/Toast';
import './ProfilePage.css';

interface Props {
  onCoupleLeft: () => void;
}

type ToastState = { message: string; type: ToastType };

function Avatar({ url, name, size = 'lg' }: { url?: string; name: string; size?: 'lg' | 'md' }) {
  return (
    <div className={`profile-avatar profile-avatar-${size}`}>
      {url ? (
        <img src={url} alt={name} />
      ) : (
        <span>{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export default function ProfilePage({ onCoupleLeft }: Props) {
  const { signOut, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadProfile = useCallback(async () => {
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    isPushSubscribed().then(setPushEnabled);
  }, [loadProfile]);

  const togglePush = async () => {
    if (!user) return;
    setPushLoading(true);
    try {
      if (pushEnabled) {
        await unsubscribeFromPush();
        setPushEnabled(false);
        setToast({ message: 'Notificaciones desactivadas', type: 'info' });
      } else {
        const ok = await subscribeToPush(user.id);
        setPushEnabled(ok);
        setToast({
          message: ok
            ? 'Notificaciones activadas (también fuera de la app)'
            : 'No se pudieron activar. Revisa permisos del navegador.',
          type: ok ? 'success' : 'error',
        });
      }
    } finally {
      setPushLoading(false);
    }
  };

  const copyCode = () => {
    if (profile?.inviteCode) {
      navigator.clipboard.writeText(profile.inviteCode);
      setToast({ message: 'Código copiado', type: 'success' });
    }
  };

  const handleLeaveCouple = async () => {
    setLeaveLoading(true);
    try {
      await api.leaveCouple();
      setShowLeaveConfirm(false);
      onCoupleLeft();
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'Error al abandonar vínculo',
        type: 'error',
      });
    } finally {
      setLeaveLoading(false);
    }
  };

  if (loading) {
    return <div className="profile-page"><div className="profile-loading">Cargando...</div></div>;
  }

  if (!profile) {
    return <div className="profile-page"><div className="profile-loading">No se pudo cargar el perfil</div></div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-bg" />
        <div className="profile-hero-content">
          <Avatar url={profile.avatarUrl} name={profile.displayName} size="lg" />
          <h1>{profile.displayName}</h1>
          <p className="profile-email">{profile.email}</p>
        </div>
      </div>

      {profile.hasCouple && profile.partner ? (
        <section className="profile-couple-card">
          <div className="couple-visual">
            <Avatar url={profile.avatarUrl} name={profile.displayName} size="md" />
            <span className="couple-heart">💕</span>
            <Avatar url={profile.partner.avatarUrl} name={profile.partner.displayName} size="md" />
          </div>
          <div className="couple-text">
            <span className="couple-label">Vinculados</span>
            <h2>{profile.partner.displayName}</h2>
            <p className="profile-hint">
              Solo una pareja a la vez. Para cambiar, abandona el vínculo actual.
            </p>
          </div>
        </section>
      ) : (
        <section className="profile-card profile-invite-card">
          <div className="card-icon">🔗</div>
          <h3>Vincula tu pareja</h3>
          <p className="profile-hint">Comparte tu código con una persona</p>
          <div className="invite-row">
            <code>{profile.inviteCode}</code>
            <button type="button" className="btn-copy" onClick={copyCode}>
              Copiar
            </button>
          </div>
        </section>
      )}

      <section className="profile-menu">
        <h3 className="menu-title">Notificaciones</h3>

        {isPushSupported() ? (
          <button
            type="button"
            className="menu-item"
            onClick={togglePush}
            disabled={pushLoading}
          >
            <span className="menu-item-icon">🔔</span>
            <span className="menu-item-text">
              <strong>Alertas push</strong>
              <small>
                {pushEnabled
                  ? 'Activas — avisos al publicar o canjear cupones'
                  : 'Recibe avisos aunque no tengas la app abierta'}
              </small>
            </span>
            <span className={`push-toggle ${pushEnabled ? 'on' : ''}`}>
              {pushLoading ? '…' : pushEnabled ? 'ON' : 'OFF'}
            </span>
          </button>
        ) : (
          <p className="profile-hint push-unsupported">
            Tu navegador no soporta notificaciones push.
          </p>
        )}

        <h3 className="menu-title">Cuenta</h3>

        {profile.hasCouple && (
          <button
            type="button"
            className="menu-item menu-item-danger"
            onClick={() => setShowLeaveConfirm(true)}
          >
            <span className="menu-item-icon">💔</span>
            <span className="menu-item-text">
              <strong>Abandonar vínculo</strong>
              <small>Se borrarán los cupones compartidos</small>
            </span>
            <span className="menu-item-arrow">›</span>
          </button>
        )}

        <button type="button" className="menu-item" onClick={signOut}>
          <span className="menu-item-icon">🚪</span>
          <span className="menu-item-text">
            <strong>Cerrar sesión</strong>
            <small>Salir de tu cuenta</small>
          </span>
          <span className="menu-item-arrow">›</span>
        </button>
      </section>

      {showLeaveConfirm && (
        <ConfirmDialog
          title="Abandonar vínculo"
          message="Se eliminará tu pareja vinculada y todos los cupones compartidos. Esta acción no se puede deshacer."
          confirmLabel="Abandonar"
          variant="danger"
          loading={leaveLoading}
          onConfirm={handleLeaveCouple}
          onCancel={() => !leaveLoading && setShowLeaveConfirm(false)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

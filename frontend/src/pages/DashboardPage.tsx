import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Coupon, type Profile } from '../lib/api';
import { supabase } from '../lib/supabase';
import CouponCard from '../components/CouponCard';
import CouponModal from '../components/CouponModal';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast, { type ToastType } from '../components/Toast';
import './DashboardPage.css';

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  variant: 'default' | 'danger';
  action: () => Promise<void>;
};

type ToastState = {
  message: string;
  type: ToastType;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'drafts' | 'redeemed'>('all');
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
  }, []);

  const fetchCoupons = useCallback(async (pageNum: number, append = false) => {
    const result = await api.getCoupons(pageNum);
    setCoupons((prev) => (append ? [...prev, ...result.coupons] : result.coupons));
    setHasMore(result.hasMore);
    setPage(pageNum);
  }, []);

  const reloadCoupons = useCallback(async () => {
    await fetchCoupons(0, false);
  }, [fetchCoupons]);

  const loadData = useCallback(async () => {
    try {
      const [profileData] = await Promise.all([api.getProfile()]);
      setProfile(profileData);
      await fetchCoupons(0, false);
    } catch (err) {
      console.error(err);
      showToast('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  }, [fetchCoupons, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const coupleId = profile?.coupleId;
    if (!coupleId) return;

    const channel = supabase
      .channel(`coupons-${coupleId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'coupons',
          filter: `couple_id=eq.${coupleId}`,
        },
        () => {
          reloadCoupons();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.coupleId, reloadCoupons]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      await fetchCoupons(page + 1, true);
    } catch {
      showToast('Error al cargar más cupones', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreate = async (title: string, description: string) => {
    await api.createCoupon(title, description);
    await reloadCoupons();
    showToast('Borrador creado');
  };

  const handleUpdate = async (title: string, description: string) => {
    if (!editingCoupon) return;
    await api.updateCoupon(editingCoupon.id, title, description);
    await reloadCoupons();
    showToast('Cupón actualizado');
  };

  const handlePublish = (id: string) => {
    setConfirm({
      title: 'Publicar cupón',
      message: 'Una vez publicado no podrás borrarlo ni editarlo. Tu pareja recibirá una notificación.',
      confirmLabel: 'Publicar',
      variant: 'default',
      action: async () => {
        await api.publishCoupon(id);
        await reloadCoupons();
        showToast('Cupón publicado');
      },
    });
  };

  const handleRedeem = (id: string) => {
    setConfirm({
      title: 'Canjear cupón',
      message: '¿Seguro? Quedará invalidado permanentemente.',
      confirmLabel: 'Canjear',
      variant: 'danger',
      action: async () => {
        await api.redeemCoupon(id);
        await reloadCoupons();
        showToast('¡Cupón canjeado!');
      },
    });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      await confirm.action();
      setConfirm(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  const filteredCoupons = useMemo(() => coupons.filter((c) => {
    switch (filter) {
      case 'available':
        return c.status === 'PUBLISHED';
      case 'drafts':
        return c.status === 'DRAFT' && c.mine;
      case 'redeemed':
        return c.status === 'REDEEMED';
      default:
        return true;
    }
  }), [coupons, filter]);

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>💝 Cupones</h1>
          {profile?.partner && (
            <p className="partner-info">
              Con {profile.partner.displayName}
            </p>
          )}
        </div>
      </header>

      <div className="dashboard-actions">
        <button
          className="btn-new-coupon"
          onClick={() => {
            setEditingCoupon(null);
            setShowModal(true);
          }}
        >
          + Crear cupón
        </button>
      </div>

      <div className="filter-tabs">
        {(['all', 'available', 'drafts', 'redeemed'] as const).map((f) => (
          <button
            key={f}
            className={`filter-tab ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' && 'Todos'}
            {f === 'available' && 'Disponibles'}
            {f === 'drafts' && 'Mis borradores'}
            {f === 'redeemed' && 'Canjeados'}
          </button>
        ))}
      </div>

      <div className="coupons-grid">
        {filteredCoupons.length === 0 ? (
          <div className="empty-state">
            <p>No hay cupones {filter !== 'all' ? 'en esta categoría' : 'aún'}</p>
            <p className="empty-hint">¡Crea uno para sorprender a tu pareja!</p>
          </div>
        ) : (
          filteredCoupons.map((coupon) => (
            <CouponCard
              key={coupon.id}
              coupon={coupon}
              onEdit={(c) => {
                setEditingCoupon(c);
                setShowModal(true);
              }}
              onPublish={handlePublish}
              onRedeem={handleRedeem}
            />
          ))
        )}
      </div>

      {hasMore && filter === 'all' && (
        <button type="button" className="btn-load-more" onClick={loadMore} disabled={loadingMore}>
          {loadingMore ? 'Cargando...' : 'Cargar más'}
        </button>
      )}

      {showModal && (
        <CouponModal
          coupon={editingCoupon}
          onClose={() => {
            setShowModal(false);
            setEditingCoupon(null);
          }}
          onSave={editingCoupon ? handleUpdate : handleCreate}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          variant={confirm.variant}
          loading={confirmLoading}
          onConfirm={handleConfirm}
          onCancel={() => !confirmLoading && setConfirm(null)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}

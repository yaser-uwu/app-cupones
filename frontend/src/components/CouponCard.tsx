import type { Coupon } from '../lib/api';
import './CouponCard.css';

interface Props {
  coupon: Coupon;
  onEdit?: (coupon: Coupon) => void;
  onPublish?: (id: string) => void;
  onRedeem?: (id: string) => void;
}

const statusLabels: Record<string, string> = {
  DRAFT: 'Borrador',
  PUBLISHED: 'Disponible',
  REDEEMED: 'Canjeado',
};

export default function CouponCard({ coupon, onEdit, onPublish, onRedeem }: Props) {
  return (
    <div className={`coupon-card status-${coupon.status.toLowerCase()}`}>
      <div className="coupon-header">
        <span className={`status-badge ${coupon.status.toLowerCase()}`}>
          {statusLabels[coupon.status]}
        </span>
        <span className="coupon-author">
          {coupon.mine ? 'Tú' : coupon.creatorName}
        </span>
      </div>

      <h3 className="coupon-title">{coupon.title}</h3>
      {coupon.description && (
        <p className="coupon-description">{coupon.description}</p>
      )}

      <div className="coupon-actions">
        {coupon.canEdit && onEdit && (
          <button className="btn-action edit" onClick={() => onEdit(coupon)}>
            Editar
          </button>
        )}
        {coupon.canEdit && onPublish && (
          <button className="btn-action publish" onClick={() => onPublish(coupon.id)}>
            Publicar
          </button>
        )}
        {coupon.canRedeem && onRedeem && (
          <button className="btn-action redeem" onClick={() => onRedeem(coupon.id)}>
            Canjear ✨
          </button>
        )}
      </div>

      {coupon.status === 'REDEEMED' && coupon.redeemedAt && (
        <p className="redeemed-info">
          Canjeado el {new Date(coupon.redeemedAt).toLocaleDateString('es-ES')}
        </p>
      )}
    </div>
  );
}

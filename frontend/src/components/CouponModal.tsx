import { useState } from 'react';
import type { Coupon } from '../lib/api';
import './CouponModal.css';

interface Props {
  coupon?: Coupon | null;
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
}

export default function CouponModal({ coupon, onClose, onSave }: Props) {
  const [title, setTitle] = useState(coupon?.title ?? '');
  const [description, setDescription] = useState(coupon?.description ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEdit = !!coupon;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onSave(title, description);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? 'Editar cupón' : 'Nuevo cupón'}</h2>
        <p className="modal-hint">
          {isEdit
            ? 'Puedes editar mientras esté en borrador'
            : 'Crea un cupón para tu pareja. Podrás editarlo antes de publicarlo.'}
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Título
            <input
              type="text"
              placeholder='Ej: "Válido para invitarte el helado"'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
            />
          </label>

          <label>
            Descripción (opcional)
            <textarea
              placeholder="Detalles adicionales..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear borrador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { api } from '../lib/api';
import './JoinCouplePage.css';

interface Props {
  inviteCode: string;
  onJoined: () => void;
}

export default function JoinCouplePage({ inviteCode, onJoined }: Props) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.joinCouple(code);
      onJoined();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al vincular');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
  };

  return (
    <div className="join-page">
      <div className="join-card">
        <h2>Vincula tu pareja 💑</h2>
        <p>Comparte tu código con una persona para vincularos y crear cupones juntos</p>

        <div className="invite-box">
          <label>Tu código de invitación</label>
          <div className="invite-code">
            <code>{inviteCode}</code>
            <button type="button" onClick={copyCode} className="btn-copy">
              Copiar
            </button>
          </div>
        </div>

        <div className="divider">o ingresa el código de tu pareja</div>

        <form onSubmit={handleJoin}>
          <input
            type="text"
            placeholder="Código de invitación"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Vinculando...' : 'Vincular pareja'}
          </button>
        </form>
      </div>
    </div>
  );
}

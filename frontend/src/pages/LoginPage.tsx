import { useAuth } from '../context/AuthContext';
import './LoginPage.css';

export default function LoginPage() {
  const { signInWithGoogle, signInWithFacebook } = useAuth();

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">💝</div>
        <h1>Cupones de Pareja</h1>
        <p className="login-subtitle">
          Crea cupones especiales para tu pareja y canjéalos cuando quieras
        </p>

        <div className="login-buttons">
          <button className="btn btn-google" onClick={signInWithGoogle}>
            <span>G</span> Continuar con Google
          </button>
          <button className="btn btn-facebook" onClick={signInWithFacebook}>
            <span>f</span> Continuar con Facebook
          </button>
        </div>

        <p className="login-footer">
          Ejemplo: "Válido para invitarte el helado" 🍦
        </p>
      </div>
    </div>
  );
}

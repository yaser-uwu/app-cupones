import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { api, type Profile } from './lib/api';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import JoinCouplePage from './pages/JoinCouplePage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import { NotificationProvider } from './context/NotificationContext';

function AppContent() {
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile();
    } else {
      setProfile(null);
    }
  }, [user, loadProfile]);

  if (loading || (user && profileLoading)) {
    return <div className="loading-screen">Cargando...</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!profile?.hasCouple) {
    return (
      <JoinCouplePage
        inviteCode={profile?.inviteCode ?? ''}
        onJoined={loadProfile}
      />
    );
  }

  return (
    <BrowserRouter>
      <NotificationProvider>
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/perfil" element={<ProfilePage onCoupleLeft={loadProfile} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}

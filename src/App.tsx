import { useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import Navbar from './Navbar';
import Dashboard from './pages/Dashboard';
import InputKalibrasi from './pages/InputKalibrasi';
import ReviewKalibrasi from './pages/ReviewKalibrasi';
import Approve from './pages/Approve';
import Masterlist from './pages/Masterlist';
import CalibrationThisMonth from './pages/CalibrationThisMonth';
import RevisiKalibrasi from './pages/RevisiKalibrasi';
import AdminUsers from './pages/AdminUsers'

const defaultPageByRole = {
  teknisi: 'dashboard',
  qc: 'dashboard',
  admin: 'dashboard',
};

export default function App() {
  const [profile, setProfile] = useState(null);
  const [currentPage, setCurrentPage] = useState(null);

  function handleLogin(profileData) {
    setProfile(profileData);
    setCurrentPage(defaultPageByRole[profileData.role] || 'dashboard');
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setProfile(null);
    setCurrentPage(null);
  }

  if (!profile) {
    return <Login onLogin={handleLogin} />;
  }

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard profile={profile} onNavigate={setCurrentPage} />;
      case 'input_new': 
        return <InputKalibrasi profile={profile} onNavigate={setCurrentPage} mode="new" />
      case 're_kalibrasi': 
        return <InputKalibrasi profile={profile} onNavigate={setCurrentPage} mode="re" />
      case 'input_external': 
        return <InputKalibrasi profile={profile} onNavigate={setCurrentPage} mode="external" />
      case 'review':
        return <ReviewKalibrasi profile={profile} />;
      case 'approve':
        return <Approve profile={profile} />;
      case 'masterlist': 
        return <Masterlist profile={profile} />;
      case 'due_month':
        return <CalibrationThisMonth />;
      case 'revisi': 
        return <RevisiKalibrasi profile={profile} />;
      case 'users': 
        return <AdminUsers profile={profile} />;
      default:
        return null;
    }
  }

  return (
    <div style={{ display: 'flex' }}>
      <Navbar
        profile={profile}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={handleLogout}
      />
      <div style={{ flex: 1, minHeight: '100vh' }}>{renderPage()}</div>
    </div>
  );
}

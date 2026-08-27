import {
  Plus,
  Clock,
  FileCheck,
  Table2,
  LayoutDashboard,
  LogOut,
  Lock,
} from 'lucide-react';

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'input', label: 'Kalibrasi Baru', icon: Plus },
  { key: 'review', label: 'Waiting Approve', icon: Clock },
  { key: 'approve', label: 'Generate Certificate', icon: FileCheck },
  { key: 'masterlist', label: 'Masterlist', icon: Table2 },
  { key: 'due_month', label: 'Calibration on This Month', icon: Clock },
  { key: 'revisi', label: 'Perlu Diperbaiki', icon: Clock },
];

export default function Navbar({ profile, currentPage, onNavigate, onLogout }) {
  return (
    <div style={styles.sidebar}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <div style={styles.logoBox}>
        <img
          src="/logo.png"
          alt="Logo"
          style={styles.logoImg}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
        <div style={styles.logoText}>Yokohama Calibration Portal</div>
      </div>

      <div style={styles.menuList}>
        {menuItems.map((item) => {
          const active = currentPage === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              style={{
                ...styles.menuItem,
                ...(active ? styles.menuItemActive : {}),
              }}
            >
              <Icon size={17} />
              <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.userBox}>
        <div>
          <div style={styles.userName}>{profile.full_name || 'User'}</div>
          <div style={styles.userRole}>{profile.role}</div>
        </div>
        <button onClick={onLogout} style={styles.logoutBtn}>
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    width: 220,
    minHeight: '100vh',
    background: '#10191B',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: 'Inter, sans-serif',
    flexShrink: 0,
  },
  logoBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '20px 20px',
    borderBottom: '1px solid #223032',
  },
  logoImg: { width: 32, height: 32, objectFit: 'contain', flexShrink: 0 },
  logoText: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 15,
    fontWeight: 700,
    lineHeight: 1.25,
  },
  menuList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    padding: '16px 12px',
    flex: 1,
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    color: '#C8D0CE',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    textAlign: 'left',
  },
  menuItemActive: { background: '#1E2C2E', color: '#fff' },
  menuItemDisabled: { color: '#4A5250', cursor: 'not-allowed' },
  userBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderTop: '1px solid #223032',
  },
  userName: { fontSize: 13, fontWeight: 600 },
  userRole: { fontSize: 11, color: '#8A9391', textTransform: 'capitalize' },
  logoutBtn: {
    background: 'none',
    border: 'none',
    color: '#C8D0CE',
    cursor: 'pointer',
  },
};

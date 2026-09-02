import { useState } from 'react'
import { Plus, Clock, FileCheck, Table2, LayoutDashboard, LogOut, RefreshCw, FileWarning, AlertTriangle, Users, BarChart3, ChevronDown, ChevronRight, Upload, FileUp } from 'lucide-react'

const menuGroups = [
  {
    label: null,
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'OPERASIONAL',
    items: [
      { key: 'input_new', label: 'Kalibrasi Baru', icon: Plus },
      { key: 're_kalibrasi', label: 'Re-Kalibrasi', icon: RefreshCw },
      { key: 'input_external', label: 'Kalibrasi Eksternal', icon: FileCheck },
      { key: 'review', label: 'Waiting Approve', icon: Clock },
      { key: 'approve', label: 'Generate Certificate', icon: FileCheck },
    ],
  },
  {
    label: 'MASTER DATA',
    items: [
      { key: 'masterlist', label: 'Masterlist', icon: Table2 },
      { key: 'revisi', label: 'Perlu Diperbaiki', icon: FileWarning },
      { key: 'due_month', label: 'Alert Jatuh Tempo', icon: AlertTriangle },
      { key: 'import', label: 'Import Data Awal', icon: Upload },
      { key: 'bulk_cert', label: 'Upload Sertifikat Massal', icon: FileUp },
    ],
  },
  {
    label: 'PENGATURAN & LAPORAN',
    items: [
      { key: 'users', label: 'Manajemen User', icon: Users },
      { key: 'laporan', label: 'Laporan Bulanan', icon: BarChart3 },
    ],
  },
]

export default function Navbar({ profile, currentPage, onNavigate, onLogout }) {
  const [expanded, setExpanded] = useState({
    OPERASIONAL: true,
    'MASTER DATA': true,
    'PENGATURAN & LAPORAN': true,
  })

  function toggleGroup(label) {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  return (
    <div style={styles.sidebar}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <div style={styles.logoBox}>
        <img src="/logo.png" alt="Logo" style={styles.logoImg} onError={(e) => { e.target.style.display = 'none' }} />
        <div style={styles.logoText}>Yokohama Calibration Portal</div>
      </div>

      <div style={styles.menuList}>
        {menuGroups.map((group, gi) => (
          <div key={gi} style={{ marginBottom: 4 }}>
            {group.label && (
              <button onClick={() => toggleGroup(group.label)} style={styles.groupHeader}>
                <span>{group.label}</span>
                {expanded[group.label] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>
            )}
            {(!group.label || expanded[group.label]) && group.items.map((item) => {
              const active = currentPage === item.key
              const Icon = item.icon
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
              )
            })}
          </div>
        ))}
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
  )
}

const styles = {
  sidebar: {
    width: 230, minHeight: '100vh', background: '#10191B', color: '#fff',
    display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif',
    flexShrink: 0,
  },
  logoBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '20px 20px', borderBottom: '1px solid #223032',
  },
  logoImg: { width: 32, height: 32, objectFit: 'contain', flexShrink: 0 },
  logoText: {
    fontFamily: 'Space Grotesk, sans-serif', fontSize: 15, fontWeight: 700, lineHeight: 1.25,
  },
  menuList: { display: 'flex', flexDirection: 'column', padding: '14px 12px', flex: 1, overflowY: 'auto' },
  groupHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', color: '#6B7371',
    padding: '10px 12px 4px', textTransform: 'uppercase',
    background: 'none', border: 'none', cursor: 'pointer',
  },
  menuItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
    borderRadius: 6, border: 'none', borderLeft: '3px solid transparent', background: 'transparent', color: '#C8D0CE',
    fontSize: 13.5, fontWeight: 500, cursor: 'pointer', textAlign: 'left', width: '100%',
  },
  menuItemActive: { background: '#1E2C2E', color: '#fff', borderLeft: '3px solid #3FA796' },
  userBox: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 20px', borderTop: '1px solid #223032',
  },
  userName: { fontSize: 13, fontWeight: 600 },
  userRole: { fontSize: 11, color: '#8A9391', textTransform: 'capitalize' },
  logoutBtn: { background: 'none', border: 'none', color: '#C8D0CE', cursor: 'pointer' },
}
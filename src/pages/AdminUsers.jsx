import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const styles = {
  wrap: { fontFamily: 'Inter, sans-serif', background: '#EEF2F0', minHeight: '100vh', padding: '28px 32px' },
  title: { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 24px 0' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E4E9E7', padding: 20, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 12, color: '#8A8F8D', padding: '8px 10px', borderBottom: '1px solid #E4E9E7' },
  td: { padding: '8px 10px', borderBottom: '1px solid #F0F2F1', fontSize: 14 },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontSize: 14, width: '100%' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontSize: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 12 },
  submitBtn: { background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
}

export default function AdminUsers({ profile }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ username: '', full_name: '', email: '', password: '', role: 'teknisi' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const isAdmin = profile.role === 'admin'

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true })
    if (!error) setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleCreate(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { data: { session } } = await supabase.auth.getSession()

    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'create', ...form }),
    })
    const result = await res.json()

    if (!res.ok) {
      setMessage('❌ Gagal: ' + (result.error || 'Terjadi kesalahan'))
    } else {
      setMessage('✅ User berhasil dibuat.')
      setForm({ username: '', full_name: '', email: '', password: '', role: 'teknisi' })
      loadUsers()
    }
    setSaving(false)
  }

  async function handleRoleChange(userId, newRole) {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
    if (error) {
      alert('Gagal update role: ' + error.message)
      return
    }
    loadUsers()
  }

  async function handleResetPassword(userId) {
    const newPassword = window.prompt('Masukkan password baru untuk user ini (minimal 6 karakter):')
    if (!newPassword) return

    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action: 'reset_password', user_id: userId, new_password: newPassword }),
    })
    const result = await res.json()
    if (!res.ok) {
      alert('Gagal reset password: ' + (result.error || 'Terjadi kesalahan'))
    } else {
      alert('Password berhasil direset.')
    }
  }

  if (!isAdmin) {
    return <div style={styles.wrap}><p>🔒 Halaman ini hanya untuk Admin.</p></div>
  }

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Manajemen User</h1>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Tambah User Baru</h3>
        <form onSubmit={handleCreate}>
          <div style={styles.grid}>
            <input style={styles.input} placeholder="Username" required value={form.username} onChange={(e) => handleChange('username', e.target.value)} />
            <input style={styles.input} placeholder="Nama Lengkap" required value={form.full_name} onChange={(e) => handleChange('full_name', e.target.value)} />
            <input style={styles.input} type="email" placeholder="Email" required value={form.email} onChange={(e) => handleChange('email', e.target.value)} />
            <input style={styles.input} type="password" placeholder="Password" required minLength={6} value={form.password} onChange={(e) => handleChange('password', e.target.value)} />
            <select style={styles.select} value={form.role} onChange={(e) => handleChange('role', e.target.value)}>
              <option value="teknisi">Teknisi</option>
              <option value="qc">QC</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {message && <p>{message}</p>}
          <button type="submit" disabled={saving} style={styles.submitBtn}>
            {saving ? 'Menyimpan...' : 'Buat User'}
          </button>
        </form>
      </div>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Daftar User</h3>
        {loading ? <p>Memuat...</p> : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Username</th>
                <th style={styles.th}>Nama</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td style={styles.td}>{u.username || '-'}</td>
                  <td style={styles.td}>{u.full_name || '-'}</td>
                  <td style={styles.td}>{u.email || '-'}</td>
                  <td style={styles.td}>
                    <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={styles.select}>
                      <option value="teknisi">Teknisi</option>
                      <option value="qc">QC</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td style={styles.td}>
                    <button onClick={() => handleResetPassword(u.id)} style={{ ...styles.submitBtn, padding: '6px 12px', fontSize: 12 }}>
                      Reset Password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
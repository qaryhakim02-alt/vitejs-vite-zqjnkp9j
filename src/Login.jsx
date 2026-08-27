import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data: email, error: lookupError } = await supabase.rpc(
      'get_email_by_username',
      { p_username: username }
    );

    if (lookupError || !email) {
      setErrorMsg('Username tidak ditemukan.');
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg('Username atau password salah.');
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      setErrorMsg('Gagal mengambil data profil.');
      setLoading(false);
      return;
    }

    setLoading(false);
    onLogin(profile);
  }

  return (
    <div
      style={{ maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}
    >
      <h2>Login Sistem Kalibrasi</h2>
      <form onSubmit={handleLogin}>
        <div style={{ marginBottom: 12 }}>
          <label>Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </div>
        {errorMsg && <p style={{ color: 'red' }}>{errorMsg}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: 10 }}
        >
          {loading ? 'Memproses...' : 'Login'}
        </button>
      </form>
    </div>
  );
}

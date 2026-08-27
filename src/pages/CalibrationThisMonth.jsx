import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const styles = {
  wrap: {
    fontFamily: 'Inter, sans-serif',
    background: '#EEF2F0',
    minHeight: '100vh',
    padding: '28px 32px',
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 26,
    fontWeight: 700,
    margin: '0 0 6px 0',
  },
  subtitle: { fontSize: 14, color: '#6B7371', marginBottom: 24 },
  card: {
    background: '#fff',
    borderRadius: 12,
    border: '1px solid #E4E9E7',
    overflow: 'hidden',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    textAlign: 'left',
    fontSize: 11,
    letterSpacing: '0.04em',
    color: '#8A8F8D',
    textTransform: 'uppercase',
    padding: '10px 20px',
    borderBottom: '1px solid #E4E9E7',
  },
  td: { padding: '14px 20px', borderBottom: '1px solid #F0F2F1', fontSize: 14 },
  mono: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 },
  itemName: { fontWeight: 600 },
  itemSub: { fontSize: 12, color: '#8A8F8D' },
  badge: {
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: 999,
    display: 'inline-block',
  },
};

function StatusBadge({ status }) {
  const map = {
    draft: { text: 'Draft', color: '#8A8F8D', bg: '#EEF0EF' },
    review: { text: 'Menunggu QC', color: '#B5791C', bg: '#FBF1DD' },
    approved: { text: 'Disetujui', color: '#1C7A63', bg: '#E2F3EE' },
  };
  const s = map[status] || map.draft;
  return (
    <span style={{ ...styles.badge, color: s.color, background: s.bg }}>
      {s.text}
    </span>
  );
}

export default function CalibrationThisMonth() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);

      const { data, error } = await supabase
        .from('calibration_records')
        .select(
          `
          id, due_date, calibration_date, certificate_number, certificate_url, status,
          item_serials ( serial_no, location_area, items ( item_name, type_model, merk_brand ) )
        `
        )
        .gte('due_date', firstDay)
        .lte('due_date', lastDay)
        .order('due_date', { ascending: true });

      if (!error) setRecords(data);
      setLoading(false);
    }
    load();
  }, []);

  const monthLabel = new Date().toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Calibration on This Month</h1>
      <div style={styles.subtitle}>
        Alat dengan jatuh tempo kalibrasi di bulan {monthLabel} (
        {records.length} item)
      </div>

      <div style={styles.card}>
        {loading ? (
          <div style={{ padding: 20 }}>Memuat data...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 20, color: '#8A8F8D' }}>
            Tidak ada alat yang jatuh tempo bulan ini.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Alat</th>
                <th style={styles.th}>Serial / Lokasi</th>
                <th style={styles.th}>No. Sertifikat</th>
                <th style={styles.th}>Tanggal Kalibrasi</th>
                <th style={styles.th}>Jatuh Tempo</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>
                    <div style={styles.itemName}>
                      {r.item_serials?.items?.item_name}
                    </div>
                    <div style={styles.itemSub}>
                      {r.item_serials?.items?.merk_brand}
                    </div>
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>
                    {r.item_serials?.serial_no} <br />
                    <span style={styles.itemSub}>
                      {r.item_serials?.location_area}
                    </span>
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>
                    {r.certificate_url ? (
                      <a
                        href={r.certificate_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {r.certificate_number}
                      </a>
                    ) : (
                      r.certificate_number || '-'
                    )}
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>
                    {r.calibration_date || '-'}
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>{r.due_date}</td>
                  <td style={styles.td}>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

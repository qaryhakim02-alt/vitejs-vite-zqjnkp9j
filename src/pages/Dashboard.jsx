import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, Download, Gauge } from 'lucide-react';

function DialStat({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0;
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - pct);

  return (
    <div className="dial-card">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="#E4E9E7"
          strokeWidth="6"
        />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
        />
      </svg>
      <div>
        <div className="dial-label">{label}</div>
        <div className="dial-value">{value}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: { text: 'Draft', color: '#8A8F8D', bg: '#EEF0EF' },
    review: { text: 'Menunggu QC', color: '#B5791C', bg: '#FBF1DD' },
    qc_approved: { text: 'Menunggu Admin', color: '#B5791C', bg: '#FBF1DD' },
    approved: { text: 'Disetujui', color: '#1C7A63', bg: '#E2F3EE' },
  };
  const s = map[status] || map.draft;
  return (
    <span className="status-badge" style={{ color: s.color, background: s.bg }}>
      {s.text}
    </span>
  );
}

export default function Dashboard({ profile, onNavigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('calibration_records')
        .select(
          `
          id, calibration_date, due_date, certificate_number, certificate_url, status,
          item_serials ( items ( item_name, merk_brand ) )
        `
        )
        .order('calibration_date', { ascending: false })
        .limit(8);

      if (!error) setRecords(data);
      setLoading(false);
    }
    load();
  }, []);

  const total = records.length;
  const waiting = records.filter(
    (r) => r.status === 'review' || r.status === 'qc_approved'
  ).length;
  const approved = records.filter((r) => r.status === 'approved').length;

  return (
    <div className="dash-wrap">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

        .dash-wrap {
          font-family: 'Inter', sans-serif;
          background: #EEF2F0;
          min-height: 100vh;
          padding: 32px;
          color: #1B2422;
        }
        .dash-eyebrow { font-size: 13px; color: #3FA796; font-weight: 600; margin-bottom: 4px; }
        .dash-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; flex-wrap: wrap; gap: 16px; }
        .dash-title { font-family: 'Space Grotesk', sans-serif; font-size: 30px; font-weight: 700; margin: 0; }
        .dash-actions { display: flex; gap: 10px; }
        .btn-primary, .btn-secondary {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 16px; border-radius: 8px; border: none;
          font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer;
        }
        .btn-primary { background: #1B2422; color: #fff; }
        .btn-secondary { background: #fff; color: #1B2422; border: 1px solid #D6DCDA; }

        .dial-row { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
        .dial-card {
          flex: 1; min-width: 180px; background: #fff; border-radius: 12px;
          padding: 20px; display: flex; align-items: center; gap: 16px;
          border: 1px solid #E4E9E7;
        }
        .dial-label { font-size: 13px; color: #6B7371; margin-bottom: 4px; }
        .dial-value { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; }

        .table-card { background: #fff; border-radius: 12px; border: 1px solid #E4E9E7; overflow: hidden; }
        .table-header { padding: 16px 20px; font-size: 13px; color: #6B7371; font-weight: 600; border-bottom: 1px solid #E4E9E7; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 11px; letter-spacing: 0.04em; color: #8A8F8D; text-transform: uppercase; padding: 10px 20px; border-bottom: 1px solid #E4E9E7; }
        td { padding: 14px 20px; border-bottom: 1px solid #F0F2F1; font-size: 14px; vertical-align: top; }
        tr:last-child td { border-bottom: none; }
        .item-name { font-weight: 600; }
        .item-sub { font-size: 12px; color: #8A8F8D; }
        .mono { font-family: 'IBM Plex Mono', monospace; font-size: 13px; }
        .status-badge { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 999px; display: inline-block; }
      `}</style>

      <div className="dash-eyebrow">
        SELAMAT DATANG, {(profile.full_name || 'USER').toUpperCase()}
      </div>
      <div className="dash-header-row">
        <h1 className="dash-title">Dashboard Kalibrasi</h1>
        <div className="dash-actions">
          <button className="btn-primary" onClick={() => onNavigate('input')}>
            <Plus size={16} /> Kalibrasi Baru
          </button>
        </div>
      </div>

      <div className="dial-row">
        <DialStat
          label="Total Rekaman"
          value={total}
          total={Math.max(total, 1)}
          color="#1B2422"
        />
        <DialStat
          label="Menunggu Persetujuan"
          value={waiting}
          total={Math.max(total, 1)}
          color="#E2A63B"
        />
        <DialStat
          label="Disetujui"
          value={approved}
          total={Math.max(total, 1)}
          color="#3FA796"
        />
      </div>

      <div className="table-card">
        <div className="table-header">AKTIVITAS TERBARU</div>
        {loading ? (
          <div style={{ padding: 20 }}>Memuat data...</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 20, color: '#8A8F8D' }}>
            Belum ada data kalibrasi.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Alat</th>
                <th>No. Sertifikat</th>
                <th>Tanggal</th>
                <th>Jatuh Tempo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="item-name">
                      {r.item_serials?.items?.item_name}
                    </div>
                    <div className="item-sub">
                      {r.item_serials?.items?.merk_brand}
                    </div>
                  </td>
                  <td className="mono">
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
                  <td className="mono">{r.calibration_date || '-'}</td>
                  <td className="mono">{r.due_date || '-'}</td>
                  <td>
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

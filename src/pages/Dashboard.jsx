import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Clock, FileWarning, FileCheck2, AlertTriangle, ArrowRight } from 'lucide-react'

function DialStat({ label, value, total, color }) {
  const pct = total > 0 ? Math.min(value / total, 1) : 0
  const circumference = 2 * Math.PI * 24
  const offset = circumference * (1 - pct)

  return (
    <div className="dial-card">
      <svg width="56" height="56" viewBox="0 0 56 56">
        <circle cx="28" cy="28" r="24" fill="none" stroke="#E4E9E7" strokeWidth="5" />
        <circle
          cx="28" cy="28" r="24" fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
        />
      </svg>
      <div>
        <div className="dial-label">{label}</div>
        <div className="dial-value">{value}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    draft: { text: 'Draft', color: '#8A8F8D', bg: '#EEF0EF' },
    review: { text: 'Menunggu QC', color: '#B5791C', bg: '#FBF1DD' },
    approved: { text: 'Disetujui', color: '#1C7A63', bg: '#E2F3EE' },
  }
  const s = map[status] || map.draft
  return (
    <span className="status-badge" style={{ color: s.color, background: s.bg }}>
      {s.text}
    </span>
  )
}

const actionCardByRole = {
  teknisi: { icon: FileWarning, page: 'revisi', color: '#E2A63B', getText: (n) => `${n} data perlu diperbaiki & diajukan ulang` },
  qc: { icon: Clock, page: 'review', color: '#B5791C', getText: (n) => `${n} data menunggu review Anda` },
  admin: { icon: FileCheck2, page: 'approve', color: '#3FA796', getText: (n) => `${n} sertifikat perlu digenerate` },
}

export default function Dashboard({ profile, onNavigate }) {
  const [recent, setRecent] = useState([])
  const [stats, setStats] = useState({ total: 0, review: 0, draft: 0, approved: 0, dueSoon: 0, pendingCert: 0 })
  const [equipmentStats, setEquipmentStats] = useState({ active: 0, damaged: 0, lost: 0, retired: 0 })
  const [actionCount, setActionCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = new Date().toISOString().slice(0, 10)
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const [
        totalRes, reviewRes, draftRes, approvedRes, dueSoonRes, pendingCertRes,
        activeRes, damagedRes, lostRes, retiredRes, recentRes,
      ] = await Promise.all([
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'review'),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'approved').lte('due_date', in30Days).gte('due_date', today),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'approved').eq('is_external', false).is('certificate_number', null),
        supabase.from('item_serials').select('id', { count: 'exact', head: true }).eq('equipment_status', 'active'),
        supabase.from('item_serials').select('id', { count: 'exact', head: true }).eq('equipment_status', 'damaged'),
        supabase.from('item_serials').select('id', { count: 'exact', head: true }).eq('equipment_status', 'lost'),
        supabase.from('item_serials').select('id', { count: 'exact', head: true }).eq('equipment_status', 'retired'),
        supabase
          .from('calibration_records')
          .select(`
            id, calibration_date, due_date, certificate_number, certificate_url, status,
            item_serials ( items ( item_name, merk_brand ) )
          `)
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      setStats({
        total: totalRes.count || 0,
        review: reviewRes.count || 0,
        draft: draftRes.count || 0,
        approved: approvedRes.count || 0,
        dueSoon: dueSoonRes.count || 0,
        pendingCert: pendingCertRes.count || 0,
      })
      setEquipmentStats({
        active: activeRes.count || 0,
        damaged: damagedRes.count || 0,
        lost: lostRes.count || 0,
        retired: retiredRes.count || 0,
      })
      setRecent(recentRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    async function loadActionCount() {
      if (profile.role === 'teknisi') {
        const { count } = await supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'draft').eq('created_by', profile.id)
        setActionCount(count || 0)
      } else if (profile.role === 'qc') {
        setActionCount(stats.review)
      } else if (profile.role === 'admin') {
        setActionCount(stats.pendingCert)
      }
    }
    loadActionCount()
  }, [profile, stats.review, stats.pendingCert])

  const actionCfg = actionCardByRole[profile.role]

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
        .dash-header-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 16px; }
        .dash-title { font-family: 'Space Grotesk', sans-serif; font-size: 30px; font-weight: 700; margin: 0; }
        .btn-primary {
          display: flex; align-items: center; gap: 6px;
          padding: 10px 16px; border-radius: 8px; border: none;
          font-family: 'Inter', sans-serif; font-weight: 600; font-size: 14px; cursor: pointer;
          background: #1B2422; color: #fff;
        }

        .action-banner {
          display: flex; align-items: center; justify-content: space-between;
          background: #fff; border-radius: 12px; padding: 18px 22px; margin-bottom: 24px;
          border-left: 5px solid var(--action-color);
        }
        .action-left { display: flex; align-items: center; gap: 14px; }
        .action-text { font-size: 15px; font-weight: 600; }
        .action-btn {
          display: flex; align-items: center; gap: 6px; background: #1B2422; color: #fff;
          border: none; border-radius: 8px; padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
        }

        .dial-row { display: flex; gap: 14px; margin-bottom: 20px; flex-wrap: wrap; }
        .dial-card {
          flex: 1; min-width: 165px; background: #fff; border-radius: 12px;
          padding: 16px; display: flex; align-items: center; gap: 12px;
          border: 1px solid #E4E9E7;
        }
        .dial-label { font-size: 12px; color: #6B7371; margin-bottom: 2px; }
        .dial-value { font-family: 'Space Grotesk', sans-serif; font-size: 22px; font-weight: 700; }

        .equip-row { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .equip-card { flex: 1; min-width: 130px; background: #fff; border-radius: 12px; border: 1px solid #E4E9E7; padding: 14px 16px; }
        .equip-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
        .equip-label { font-size: 12px; color: #6B7371; }
        .equip-value { font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 700; margin-top: 2px; }

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

      <div className="dash-eyebrow">SELAMAT DATANG, {(profile.full_name || 'USER').toUpperCase()}</div>
      <div className="dash-header-row">
        <h1 className="dash-title">Dashboard Kalibrasi</h1>
        <button className="btn-primary" onClick={() => onNavigate('input_new')}>
          <Plus size={16} /> Kalibrasi Baru
        </button>
      </div>

      {actionCfg && actionCount > 0 && (
        <div className="action-banner" style={{ '--action-color': actionCfg.color }}>
          <div className="action-left">
            <actionCfg.icon size={22} color={actionCfg.color} />
            <span className="action-text">{actionCfg.getText(actionCount)}</span>
          </div>
          <button className="action-btn" onClick={() => onNavigate(actionCfg.page)}>
            Lihat sekarang <ArrowRight size={14} />
          </button>
        </div>
      )}

      <div className="dial-row">
        <DialStat label="Total Rekaman" value={stats.total} total={Math.max(stats.total, 1)} color="#1B2422" />
        <DialStat label="Menunggu QC" value={stats.review} total={Math.max(stats.total, 1)} color="#E2A63B" />
        <DialStat label="Perlu Diperbaiki" value={stats.draft} total={Math.max(stats.total, 1)} color="#D64545" />
        <DialStat label="Perlu Generate Certificate" value={stats.pendingCert} total={Math.max(stats.total, 1)} color="#3FA796" />
        <DialStat label="Jatuh Tempo ≤30 Hari" value={stats.dueSoon} total={Math.max(stats.total, 1)} color="#B5791C" />
      </div>

      <div className="equip-row">
        <div className="equip-card">
          <div className="equip-label"><span className="equip-dot" style={{ background: '#1C7A63' }}></span>Alat Aktif</div>
          <div className="equip-value">{equipmentStats.active}</div>
        </div>
        <div className="equip-card">
          <div className="equip-label"><span className="equip-dot" style={{ background: '#B3261E' }}></span>Rusak</div>
          <div className="equip-value">{equipmentStats.damaged}</div>
        </div>
        <div className="equip-card">
          <div className="equip-label"><span className="equip-dot" style={{ background: '#8A8F8D' }}></span>Hilang</div>
          <div className="equip-value">{equipmentStats.lost}</div>
        </div>
        <div className="equip-card">
          <div className="equip-label"><span className="equip-dot" style={{ background: '#8A8F8D' }}></span>Tidak Dipakai</div>
          <div className="equip-value">{equipmentStats.retired}</div>
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">AKTIVITAS TERBARU</div>
        {loading ? (
          <div style={{ padding: 20 }}>Memuat data...</div>
        ) : recent.length === 0 ? (
          <div style={{ padding: 20, color: '#8A8F8D' }}>Belum ada data kalibrasi.</div>
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
              {recent.map((r) => (
                <tr key={r.id}>
                  <td>
                    <div className="item-name">{r.item_serials?.items?.item_name}</div>
                    <div className="item-sub">{r.item_serials?.items?.merk_brand}</div>
                  </td>
                  <td className="mono">
                    {r.certificate_url ? (
                      <a href={r.certificate_url} target="_blank" rel="noreferrer">{r.certificate_number}</a>
                    ) : (r.certificate_number || '-')}
                  </td>
                  <td className="mono">{r.calibration_date || '-'}</td>
                  <td className="mono">{r.due_date || '-'}</td>
                  <td><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, Clock, FileWarning, FileCheck2, ArrowRight, AlertTriangle, Wrench, ClipboardList } from 'lucide-react'

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

const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

function buildMonthlyTrend(dates) {
  const now = new Date()
  const months = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: monthNamesId[d.getMonth()], count: 0 })
  }
  dates.forEach((dateStr) => {
    if (!dateStr) return
    const d = new Date(dateStr)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const found = months.find((m) => m.key === key)
    if (found) found.count += 1
  })
  return months
}

function TrendChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const n = data.length

  const points = data.map((d, i) => ({
    x: n > 1 ? (i / (n - 1)) * 100 : 50,
    y: 90 - (d.count / max) * 80,
    count: d.count,
    label: d.label,
  }))

  const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `M ${points[0].x} 90 ${points.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length - 1].x} 90 Z`

  return (
    <div style={{ position: 'relative', width: '100%', height: 220, marginTop: 8 }}>
      <svg
        width="100%" height="100%" viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <defs>
          <linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3FA796" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3FA796" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#trendAreaGradient)" stroke="none" />
        <path d={lineD} fill="none" stroke="#3FA796" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </svg>

      {points.map((p, i) => (
        <div key={i}>
          <div
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              width: 8, height: 8, borderRadius: '50%', background: '#3FA796',
              border: '2px solid #fff', transform: 'translate(-50%, -50%)',
              boxShadow: '0 0 0 1px rgba(63,167,150,0.3)',
            }}
          />
          <div
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              transform: 'translate(-50%, calc(-100% - 14px))',
              fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', color: '#1B2422', fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {p.count}
          </div>
          <div
            style={{
              position: 'absolute', left: `${p.x}%`, bottom: 0,
              transform: 'translateX(-50%)',
              fontSize: 12, fontFamily: 'Inter, sans-serif', color: '#6B7371',
              whiteSpace: 'nowrap',
            }}
          >
            {p.label}
          </div>
        </div>
      ))}
    </div>
  )
}

const actionCardByRole = {
  teknisi: { icon: FileWarning, page: 'revisi', color: '#E2A63B', getText: (n) => `${n} data perlu diperbaiki & diajukan ulang` },
  qc: { icon: Clock, page: 'review', color: '#B5791C', getText: (n) => `${n} data menunggu review Anda` },
  admin: { icon: FileCheck2, page: 'approve', color: '#3FA796', getText: (n) => `${n} sertifikat perlu digenerate` },
}

const newCalibrationPageByRole = {
  teknisi: 'input_new',
  admin: 'input_external',
  qc: 'input_new',
}

export default function Dashboard({ profile, onNavigate }) {
  const [recent, setRecent] = useState([])
  const [stats, setStats] = useState({ total: 0, review: 0, draft: 0, approved: 0, dueSoon: 0, overdue: 0, pendingCert: 0 })
  const [equipmentStats, setEquipmentStats] = useState({ active: 0, damaged: 0, lost: 0, retired: 0 })
  const [trend, setTrend] = useState([])
  const [actionCount, setActionCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const today = new Date().toISOString().slice(0, 10)
      const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const [
        totalRes, reviewRes, draftRes, approvedRes, dueSoonRes, overdueRes, pendingCertRes,
        activeRes, damagedRes, lostRes, retiredRes, recentRes, trendDatesRes,
      ] = await Promise.all([
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'review'),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'approved').lte('due_date', in30Days).gte('due_date', today),
        supabase.from('calibration_records').select('id', { count: 'exact', head: true }).eq('status', 'approved').lt('due_date', today),
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
        supabase.from('calibration_records').select('calibration_date').eq('status', 'approved'),
      ])

      setStats({
        total: totalRes.count || 0,
        review: reviewRes.count || 0,
        draft: draftRes.count || 0,
        approved: approvedRes.count || 0,
        dueSoon: dueSoonRes.count || 0,
        overdue: overdueRes.count || 0,
        pendingCert: pendingCertRes.count || 0,
      })
      setEquipmentStats({
        active: activeRes.count || 0,
        damaged: damagedRes.count || 0,
        lost: lostRes.count || 0,
        retired: retiredRes.count || 0,
      })
      setRecent(recentRes.data || [])
      setTrend(buildMonthlyTrend((trendDatesRes.data || []).map((r) => r.calibration_date)))
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
  const newCalibPage = newCalibrationPageByRole[profile.role] || 'input_new'
  const totalEquipment = equipmentStats.active + equipmentStats.damaged + equipmentStats.lost + equipmentStats.retired
  const dueAlertLevel = stats.overdue > 0 ? 'red' : stats.dueSoon > 0 ? 'yellow' : 'none'

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

        .card-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
        .info-card { flex: 1; min-width: 220px; background: #fff; border-radius: 12px; border: 1px solid #E4E9E7; padding: 18px 20px; position: relative; overflow: hidden; }
        .info-card-title { font-size: 12px; color: #6B7371; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; position: relative; z-index: 1; }

        .total-num { font-family: 'Space Grotesk', sans-serif; font-size: 40px; font-weight: 700; position: relative; z-index: 1; }
        .total-sub { font-size: 12px; color: #8A8F8D; margin-top: 4px; position: relative; z-index: 1; }
        .total-icon { position: absolute; right: -10px; bottom: -10px; z-index: 0; }

        .status-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; font-size: 13px; }
        .status-row-left { display: flex; align-items: center; gap: 8px; }
        .status-row-value { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 16px; }

        .segbar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; margin-bottom: 12px; background: #EEF0EF; }
        .legend-row { display: flex; align-items: center; justify-content: space-between; font-size: 13px; padding: 3px 0; }
        .legend-left { display: flex; align-items: center; gap: 8px; }
        .legend-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }

        .alert-card-red { background: #FBEAEA; border: 1px solid #F2C9C9; }
        .alert-card-yellow { background: #FBF1DD; border: 1px solid #F0DFAD; }
        .alert-num-row { display: flex; gap: 20px; margin-top: 6px; }
        .alert-num-block { text-align: left; }
        .alert-num { font-family: 'Space Grotesk', sans-serif; font-size: 26px; font-weight: 700; }
        .alert-num-label { font-size: 11px; color: #6B7371; }
        .alert-link { display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #1B2422; background: none; border: none; cursor: pointer; margin-top: 10px; }

        .trend-card { background: #fff; border-radius: 12px; border: 1px solid #E4E9E7; padding: 20px; margin-bottom: 24px; }
        .trend-header { font-size: 13px; color: #6B7371; font-weight: 600; margin-bottom: 12px; }

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
        <button className="btn-primary" onClick={() => onNavigate(newCalibPage)}>
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

      <div className="card-row">
        <div className="info-card">
          <div className="info-card-title">Total Rekaman</div>
          <div className="total-num">{stats.total}</div>
          <div className="total-sub">Seluruh riwayat kalibrasi tercatat</div>
          <ClipboardList size={80} color="#E4E9E7" className="total-icon" />
        </div>

        <div className="info-card">
          <div className="info-card-title"><Clock size={14} /> Status Proses Kalibrasi</div>
          <div className="status-row">
            <div className="status-row-left"><Clock size={14} color="#E2A63B" /> Menunggu QC</div>
            <div className="status-row-value" style={{ color: '#E2A63B' }}>{stats.review}</div>
          </div>
          <div className="status-row">
            <div className="status-row-left"><FileWarning size={14} color="#D64545" /> Perlu Diperbaiki</div>
            <div className="status-row-value" style={{ color: '#D64545' }}>{stats.draft}</div>
          </div>
          <div className="status-row">
            <div className="status-row-left"><FileCheck2 size={14} color="#3FA796" /> Perlu Sertifikat</div>
            <div className="status-row-value" style={{ color: '#3FA796' }}>{stats.pendingCert}</div>
          </div>
        </div>

        <div className="info-card">
          <div className="info-card-title"><Wrench size={14} /> Kondisi Alat</div>
          <div className="segbar">
            {totalEquipment > 0 && (
              <>
                <div style={{ width: `${(equipmentStats.active / totalEquipment) * 100}%`, background: '#1C7A63' }} />
                <div style={{ width: `${(equipmentStats.damaged / totalEquipment) * 100}%`, background: '#D64545' }} />
                <div style={{ width: `${(equipmentStats.lost / totalEquipment) * 100}%`, background: '#8A8F8D' }} />
                <div style={{ width: `${(equipmentStats.retired / totalEquipment) * 100}%`, background: '#C8CDCB' }} />
              </>
            )}
          </div>
          <div className="legend-row">
            <div className="legend-left"><span className="legend-dot" style={{ background: '#1C7A63' }}></span>Aktif</div>
            <b>{equipmentStats.active}</b>
          </div>
          <div className="legend-row">
            <div className="legend-left"><span className="legend-dot" style={{ background: '#D64545' }}></span>Rusak</div>
            <b>{equipmentStats.damaged}</b>
          </div>
          <div className="legend-row">
            <div className="legend-left"><span className="legend-dot" style={{ background: '#8A8F8D' }}></span>Hilang / Tidak Dipakai</div>
            <b>{equipmentStats.lost + equipmentStats.retired}</b>
          </div>
        </div>

        <div className={`info-card ${dueAlertLevel === 'red' ? 'alert-card-red' : dueAlertLevel === 'yellow' ? 'alert-card-yellow' : ''}`}>
          <div className="info-card-title"><AlertTriangle size={14} color={dueAlertLevel === 'red' ? '#B3261E' : dueAlertLevel === 'yellow' ? '#B5791C' : '#6B7371'} /> Alert Jatuh Tempo</div>
          <div className="alert-num-row">
            <div className="alert-num-block">
              <div className="alert-num" style={{ color: stats.overdue > 0 ? '#B3261E' : '#1B2422' }}>{stats.overdue}</div>
              <div className="alert-num-label">Sudah Lewat</div>
            </div>
            <div className="alert-num-block">
              <div className="alert-num" style={{ color: stats.dueSoon > 0 ? '#B5791C' : '#1B2422' }}>{stats.dueSoon}</div>
              <div className="alert-num-label">≤30 Hari</div>
            </div>
          </div>
          <button className="alert-link" onClick={() => onNavigate('due_month')}>
            Lihat detail <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <div className="trend-card">
        <div className="trend-header">TREN KALIBRASI SELESAI — 6 BULAN TERAKHIR</div>
        {loading ? <p>Memuat grafik...</p> : <TrendChart data={trend} />}
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
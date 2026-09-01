import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Download } from 'lucide-react'

const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

const styles = {
  wrap: { fontFamily: 'Inter, sans-serif', background: '#EEF2F0', minHeight: '100vh', padding: '28px 32px' },
  title: { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7371', marginBottom: 20 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  yearSelect: { padding: '8px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontSize: 14 },
  exportBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E4E9E7', padding: 20, marginBottom: 20, overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { border: '1px solid #E4E9E7', padding: 8, background: '#F5F7F6', textAlign: 'center', whiteSpace: 'nowrap' },
  thLabel: { border: '1px solid #E4E9E7', padding: 8, background: '#F5F7F6', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { border: '1px solid #E4E9E7', padding: 8, textAlign: 'center' },
  tdLabel: { border: '1px solid #E4E9E7', padding: 8, fontWeight: 600, whiteSpace: 'nowrap' },
  notesGrid: { display: 'grid', gridTemplateColumns: '80px 1fr 120px', gap: 8, alignItems: 'start', marginBottom: 10 },
  noteTextarea: { padding: 8, borderRadius: 6, border: '1px solid #D6DCDA', fontSize: 13, minHeight: 50, fontFamily: 'Inter, sans-serif' },
  noteSelect: { padding: 8, borderRadius: 6, border: '1px solid #D6DCDA', fontSize: 13 },
}

export default function LaporanBulanan({ profile }) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [monthData, setMonthData] = useState([])
  const [notes, setNotes] = useState({})
  const canEditNotes = profile.role === 'admin'

  async function loadReport() {
    setLoading(true)
    const yearStart = `${year}-01-01`
    const yearEnd = `${year}-12-31`

    const [planRes, actualRes, brokeRes, notesRes] = await Promise.all([
      supabase
        .from('calibration_records')
        .select('item_serial_id, calibration_date, due_date, item_serials ( equipment_status )')
        .eq('status', 'approved'),
      supabase
        .from('calibration_records')
        .select('calibration_date')
        .eq('status', 'approved')
        .gte('calibration_date', yearStart)
        .lte('calibration_date', yearEnd),
      supabase
        .from('item_serials')
        .select('equipment_status_changed_at, equipment_status')
        .neq('equipment_status', 'active')
        .gte('equipment_status_changed_at', yearStart)
        .lte('equipment_status_changed_at', yearEnd),
      supabase.from('monthly_report_notes').select('*').eq('year', year),
    ])

    // Plan: ambil siklus terakhir tiap alat aktif, kelompokkan due_date-nya per bulan (kalau jatuh di tahun ini)
    const latestPerSerial = {}
    ;(planRes.data || []).forEach((r) => {
      if (r.item_serials?.equipment_status !== 'active') return
      const existing = latestPerSerial[r.item_serial_id]
      if (!existing || r.calibration_date > existing.calibration_date) {
        latestPerSerial[r.item_serial_id] = r
      }
    })

    const planCounts = Array(12).fill(0)
    Object.values(latestPerSerial).forEach((r) => {
      if (!r.due_date) return
      const d = new Date(r.due_date)
      if (d.getFullYear() === year) planCounts[d.getMonth()] += 1
    })

    const actualCounts = Array(12).fill(0)
    ;(actualRes.data || []).forEach((r) => {
      if (!r.calibration_date) return
      const d = new Date(r.calibration_date)
      if (d.getFullYear() === year) actualCounts[d.getMonth()] += 1
    })

    const brokeCounts = Array(12).fill(0)
    ;(brokeRes.data || []).forEach((r) => {
      if (!r.equipment_status_changed_at) return
      const d = new Date(r.equipment_status_changed_at)
      if (d.getFullYear() === year) brokeCounts[d.getMonth()] += 1
    })

    let outstandingCarry = 0
    const rows = monthNamesId.map((label, i) => {
      const plan = planCounts[i]
      const planPlusOutstanding = plan + outstandingCarry
      const actual = actualCounts[i]
      const broke = brokeCounts[i]
      const outstandingEnd = Math.max(planPlusOutstanding - actual - broke, 0)
      outstandingCarry = outstandingEnd
      const actualPct = planPlusOutstanding > 0 ? Math.round((actual / planPlusOutstanding) * 100) : null
      return { label, plan, planPlusOutstanding, actual, broke, outstandingEnd, actualPct }
    })

    setMonthData(rows)

    const notesMap = {}
    ;(notesRes.data || []).forEach((n) => { notesMap[n.month] = n })
    setNotes(notesMap)
    setLoading(false)
  }

  useEffect(() => {
    loadReport()
  }, [year])

  async function saveNote(monthIndex, field, value) {
    const monthNum = monthIndex + 1
    const current = notes[monthNum] || { note: '', status: 'open' }
    const updated = { ...current, [field]: value }
    setNotes((prev) => ({ ...prev, [monthNum]: updated }))

    await supabase.from('monthly_report_notes').upsert({
      year, month: monthNum, note: updated.note || '', status: updated.status || 'open',
    }, { onConflict: 'year,month' })
  }

  function exportCSV() {
    const header = ['Bulan', 'Plan (Qty)', 'Plan + Outstanding', 'Actual (Qty)', 'Broke/Not Found', 'Outstanding (End)', 'Actual %']
    const rows = monthData.map((m) => [m.label, m.plan, m.planPlusOutstanding, m.actual, m.broke, m.outstandingEnd, m.actualPct !== null ? `${m.actualPct}%` : '-'])
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `laporan-kalibrasi-${year}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPlan = monthData.reduce((sum, m) => sum + m.plan, 0)
  const totalActual = monthData.reduce((sum, m) => sum + m.actual, 0)
  const totalBroke = monthData.reduce((sum, m) => sum + m.broke, 0)
  const totalOutstanding = monthData.length > 0 ? monthData[monthData.length - 1].outstandingEnd : 0
  const totalActualPct = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : 0

  const maxChartVal = Math.max(...monthData.map((m) => m.actualPct || 0), 100)

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Laporan Bulanan Kalibrasi</h1>
      <div style={styles.subtitle}>Ringkasan Plan vs Actual per bulan.</div>

      <div style={styles.headerRow}>
        <select style={styles.yearSelect} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <button style={styles.exportBtn} onClick={exportCSV}>
          <Download size={15} /> Export CSV
        </button>
      </div>

      {loading ? <p>Memuat laporan...</p> : (
        <>
          <div style={styles.card}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.thLabel}>Bulan</th>
                  {monthData.map((m) => <th key={m.label} style={styles.th}>{m.label}'{String(year).slice(2)}</th>)}
                  <th style={styles.th}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.tdLabel}>Target</td>
                  {monthData.map((m) => <td key={m.label} style={styles.td}>100%</td>)}
                  <td style={styles.td}>100%</td>
                </tr>
                <tr>
                  <td style={styles.tdLabel}>Actual</td>
                  {monthData.map((m) => (
                    <td key={m.label} style={{ ...styles.td, color: m.actualPct !== null && m.actualPct < 100 ? '#B3261E' : '#1C7A63', fontWeight: 700 }}>
                      {m.actualPct !== null ? `${m.actualPct}%` : '-'}
                    </td>
                  ))}
                  <td style={{ ...styles.td, fontWeight: 700 }}>{totalActualPct}%</td>
                </tr>
                <tr>
                  <td style={styles.tdLabel}>Plan (Qty)</td>
                  {monthData.map((m) => <td key={m.label} style={styles.td}>{m.plan}</td>)}
                  <td style={styles.td}>{totalPlan}</td>
                </tr>
                <tr>
                  <td style={styles.tdLabel}>Plan + Outstanding</td>
                  {monthData.map((m) => <td key={m.label} style={styles.td}>{m.planPlusOutstanding}</td>)}
                  <td style={styles.td}>-</td>
                </tr>
                <tr>
                  <td style={styles.tdLabel}>Actual (Qty)</td>
                  {monthData.map((m) => <td key={m.label} style={styles.td}>{m.actual}</td>)}
                  <td style={styles.td}>{totalActual}</td>
                </tr>
                <tr>
                  <td style={styles.tdLabel}>Broke/Not Found/Take out</td>
                  {monthData.map((m) => <td key={m.label} style={styles.td}>{m.broke}</td>)}
                  <td style={styles.td}>{totalBroke}</td>
                </tr>
                <tr>
                  <td style={styles.tdLabel}>Outstanding (End)</td>
                  {monthData.map((m) => <td key={m.label} style={styles.td}>{m.outstandingEnd}</td>)}
                  <td style={styles.td}>{totalOutstanding}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div style={styles.card}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Grafik Target vs Actual (%)</div>
            <svg width="100%" viewBox="0 0 720 220" preserveAspectRatio="xMinYMin meet">
  <line x1="40" y1="10" x2="40" y2="190" stroke="#E4E9E7" />
  <line x1="40" y1="190" x2="700" y2="190" stroke="#E4E9E7" />

  {(() => {
    const points = monthData.map((m, i) => ({
      x: 60 + i * 54,
      yTarget: 190 - (100 / maxChartVal) * 170,
      yActual: m.actualPct !== null ? 190 - (m.actualPct / maxChartVal) * 170 : null,
    }))

    const targetLine = points.map((p) => `${p.x},${p.yTarget}`).join(' ')
    const actualPoints = points.filter((p) => p.yActual !== null)
    const actualLine = actualPoints.map((p) => `${p.x},${p.yActual}`).join(' ')

    return (
      <>
        <polyline points={targetLine} fill="none" stroke="#E2A63B" strokeWidth="2" />
        <polyline points={actualLine} fill="none" stroke="#3FA796" strokeWidth="2" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.yTarget} r="3" fill="#E2A63B" />
            {p.yActual !== null && <circle cx={p.x} cy={p.yActual} r="3" fill="#3FA796" />}
          </g>
        ))}
      </>
    )
  })()}

  {monthData.map((m, i) => (
    <text key={m.label} x={60 + i * 54} y={210} textAnchor="middle" fontSize="11" fill="#6B7371">{m.label}</text>
  ))}
</svg>
            <div style={{ fontSize: 12, color: '#6B7371', display: 'flex', gap: 16 }}>
              <span>🟡 Target 100%</span>
              <span>🟢 Actual</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ fontWeight: 700, marginBottom: 12 }}>Catatan Bulanan</div>
            {monthData.map((m, i) => {
              const monthNum = i + 1
              const noteData = notes[monthNum] || { note: '', status: 'open' }
              return (
                <div key={m.label} style={styles.notesGrid}>
                  <div style={{ fontWeight: 700, paddingTop: 8 }}>{m.label}</div>
                  <textarea
                    style={styles.noteTextarea}
                    placeholder="Catatan untuk bulan ini..."
                    value={noteData.note || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [monthNum]: { ...noteData, note: e.target.value } }))}
                    onBlur={(e) => canEditNotes && saveNote(i, 'note', e.target.value)}
                    disabled={!canEditNotes}
                  />
                  <select
                    style={styles.noteSelect}
                    value={noteData.status || 'open'}
                    onChange={(e) => canEditNotes && saveNote(i, 'status', e.target.value)}
                    disabled={!canEditNotes}
                  >
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              )
            })}
            {!canEditNotes && <p style={{ fontSize: 12, color: '#8A8F8D' }}>🔒 Hanya Admin yang bisa mengubah catatan.</p>}
          </div>
        </>
      )}
    </div>
  )
}
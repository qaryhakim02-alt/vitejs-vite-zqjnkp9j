import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const styles = {
  wrap: { fontFamily: 'Inter, sans-serif', background: '#EEF2F0', minHeight: '100vh', padding: '28px 32px' },
  title: { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7371', marginBottom: 24 },
  groupTitle: { fontSize: 15, fontWeight: 700, margin: '24px 0 10px 0', display: 'flex', alignItems: 'center', gap: 8 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E4E9E7', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 11, letterSpacing: '0.04em', color: '#8A8F8D', textTransform: 'uppercase', padding: '10px 20px', borderBottom: '1px solid #E4E9E7' },
  td: { padding: '14px 20px', borderBottom: '1px solid #F0F2F1', fontSize: 14 },
  mono: { fontFamily: 'IBM Plex Mono, monospace', fontSize: 13 },
  itemName: { fontWeight: 600 },
  itemSub: { fontSize: 12, color: '#8A8F8D' },
  empty: { padding: 20, color: '#8A8F8D', fontSize: 14 },
  dot: (color) => ({ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }),
}

function GroupTable({ title, dotColor, records, emptyText }) {
  return (
    <>
      <div style={styles.groupTitle}>
        <span style={styles.dot(dotColor)}></span>
        {title} ({records.length})
      </div>
      <div style={styles.card}>
        {records.length === 0 ? (
          <div style={styles.empty}>{emptyText}</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Alat</th>
                <th style={styles.th}>Serial / Lokasi</th>
                <th style={styles.th}>No. Sertifikat</th>
                <th style={styles.th}>Tanggal Kalibrasi</th>
                <th style={styles.th}>Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={styles.td}>
                    <div style={styles.itemName}>{r.item_serials?.items?.item_name}</div>
                    <div style={styles.itemSub}>{r.item_serials?.items?.merk_brand}</div>
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>
                    {r.item_serials?.serial_no} <br />
                    <span style={styles.itemSub}>{r.item_serials?.location_area}</span>
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>
                    {r.certificate_url ? (
                      <a href={r.certificate_url} target="_blank" rel="noreferrer">{r.certificate_number}</a>
                    ) : (r.certificate_number || '-')}
                  </td>
                  <td style={{ ...styles.td, ...styles.mono }}>{r.calibration_date || '-'}</td>
                  <td style={{ ...styles.td, ...styles.mono }}>{r.due_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}

export default function CalibrationThisMonth() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      // Ambil semua data approved yang due date-nya dalam rentang 60 hari ke depan, atau sudah lewat
      const now = new Date()
      const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

      const { data, error } = await supabase
        .from('calibration_records')
        .select(`
          id, due_date, calibration_date, certificate_number, certificate_url, status,
          item_serials ( serial_no, location_area, equipment_status, items ( item_name, type_model, merk_brand ) )
        `)
        .eq('status', 'approved')
        .lte('due_date', in60Days)
        .order('due_date', { ascending: true })

      if (!error) setRecords(data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const activeRecords = records.filter((r) => (r.item_serials?.equipment_status || 'active') === 'active')
  const overdue = activeRecords.filter((r) => r.due_date < todayStr)
  const urgent = activeRecords.filter((r) => r.due_date >= todayStr && r.due_date <= in30Days)
  const upcoming = activeRecords.filter((r) => r.due_date > in30Days && r.due_date <= in60Days)

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Alert Jatuh Tempo Kalibrasi</h1>
      <div style={styles.subtitle}>Pantau alat yang perlu dijadwalkan ulang kalibrasinya, dari yang paling mendesak.</div>

      {loading ? (
        <p>Memuat data...</p>
      ) : (
        <>
          <GroupTable
            title="🔴 Sudah Lewat Jatuh Tempo"
            dotColor="#D64545"
            records={overdue}
            emptyText="Tidak ada alat yang terlambat kalibrasi ulang. Bagus!"
          />
          <GroupTable
            title="🟠 Jatuh Tempo dalam 30 Hari (H-1 Bulan)"
            dotColor="#E2A63B"
            records={urgent}
            emptyText="Tidak ada alat yang jatuh tempo dalam 30 hari ke depan."
          />
          <GroupTable
            title="🟡 Jatuh Tempo dalam 60 Hari (H-2 Bulan)"
            dotColor="#F2D06B"
            records={upcoming}
            emptyText="Tidak ada alat yang jatuh tempo dalam 60 hari ke depan."
          />
        </>
      )}
    </div>
  )
}
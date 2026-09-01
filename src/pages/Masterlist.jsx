import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Download, History, X } from 'lucide-react'

const thStyle = { border: '1px solid #ccc', padding: 8, background: '#f0f0f0', textAlign: 'left', whiteSpace: 'nowrap' }
const tdStyle = { border: '1px solid #ccc', padding: 8, whiteSpace: 'nowrap' }

const statusLabel = {
  active: { text: 'Aktif', color: '#1C7A63', bg: '#E2F3EE' },
  damaged: { text: 'Rusak', color: '#B3261E', bg: '#FBEAEA' },
  lost: { text: 'Hilang', color: '#8A8F8D', bg: '#EEF0EF' },
  retired: { text: 'Tidak Dipakai', color: '#8A8F8D', bg: '#EEF0EF' },
}

const recordStatusLabel = {
  draft: { text: 'Draft / Ditolak', color: '#B3261E', bg: '#FBEAEA' },
  review: { text: 'Menunggu QC', color: '#B5791C', bg: '#FBF1DD' },
  approved: { text: 'Disetujui', color: '#1C7A63', bg: '#E2F3EE' },
}

const modalStyles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  box: {
    background: '#fff', borderRadius: 12, padding: 24, maxWidth: 900, width: '90%',
    maxHeight: '80vh', overflowY: 'auto', fontFamily: 'Inter, sans-serif',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, margin: 0 },
  closeBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#8A8F8D' },
  badge: { fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, display: 'inline-block' },
}

function HistoryModal({ serialId, itemName, serialNo, onClose }) {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('calibration_records')
        .select('id, calibration_date, due_date, status, judgement, certificate_number, certificate_url, remark, qc_notes, is_external')
        .eq('item_serial_id', serialId)
        .order('calibration_date', { ascending: false })

      if (!error) setHistory(data)
      setLoading(false)
    }
    load()
  }, [serialId])

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.box} onClick={(e) => e.stopPropagation()}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>Riwayat Kalibrasi — {itemName} (SN: {serialNo})</h3>
          <button style={modalStyles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        {loading ? (
          <p>Memuat riwayat...</p>
        ) : history.length === 0 ? (
          <p>Belum ada riwayat kalibrasi untuk alat ini.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Tanggal Kalibrasi</th>
                <th style={thStyle}>Due Date</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Judgement</th>
                <th style={thStyle}>No. Sertifikat</th>
                <th style={thStyle}>Eksternal</th>
                <th style={thStyle}>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const label = recordStatusLabel[h.status] || recordStatusLabel.draft
                return (
                  <tr key={h.id}>
                    <td style={tdStyle}>{h.calibration_date || '-'}</td>
                    <td style={tdStyle}>{h.due_date || '-'}</td>
                    <td style={tdStyle}>
                      <span style={{ ...modalStyles.badge, color: label.color, background: label.bg }}>{label.text}</span>
                    </td>
                    <td style={tdStyle}>{h.judgement || '-'}</td>
                    <td style={tdStyle}>
                      {h.certificate_url ? (
                        <a href={h.certificate_url} target="_blank" rel="noreferrer">{h.certificate_number}</a>
                      ) : (h.certificate_number || '-')}
                    </td>
                    <td style={tdStyle}>{h.is_external ? 'Ya' : 'Tidak'}</td>
                    <td style={tdStyle}>{h.qc_notes || h.remark || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function Masterlist({ profile }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [historyTarget, setHistoryTarget] = useState(null)
  const canManageStatus = profile?.role === 'admin' || profile?.role === 'qc'

  async function loadRecords() {
    setLoading(true)
    const { data, error } = await supabase
      .from('calibration_records')
      .select(`
        id, range, unit, acceptance_tolerance, scope_of_instruments,
        calibration_date, due_date, calibration_by, is_external,
        certificate_number, certificate_url, judgement, remark,
        item_serials (
          id, serial_no, location_area, date_of_first_used, equipment_status, status_note,
          items ( item_name, type_model, merk_brand )
        )
      `)
      .eq('status', 'approved')
      .order('due_date', { ascending: true })

    if (!error) setRecords(data)
    setLoading(false)
  }

  useEffect(() => {
    loadRecords()
  }, [])

  async function handleStatusChange(serialId, newStatus) {
    let note = null
    if (newStatus === 'damaged' || newStatus === 'lost') {
      note = window.prompt(`Keterangan (opsional) untuk status "${statusLabel[newStatus].text}":`) || null
    }
    const { error } = await supabase
  .from('item_serials')
  .update({ equipment_status: newStatus, status_note: note, equipment_status_changed_at: new Date().toISOString() })
  .eq('id', serialId)

    if (error) {
      alert('Gagal update status: ' + error.message)
      return
    }
    loadRecords()
  }

  function exportCSV() {
    const header = [
      'No', 'Item', 'Type/Model', 'Merk/Brand', 'Range', 'Unit', 'Serial No.',
      'Certificate Number', 'Date of First Used', 'Calibration Date', 'Due Date',
      'Location (Area)', 'Calibration By', 'Scope of Instruments',
      'Acceptance Tolerance', 'Judgement', 'Remark', 'Eksternal', 'Status Alat',
    ]

    const rows = records.map((r, index) => [
      index + 1,
      r.item_serials?.items?.item_name || '',
      r.item_serials?.items?.type_model || '',
      r.item_serials?.items?.merk_brand || '',
      r.range || '',
      r.unit || '',
      r.item_serials?.serial_no || '',
      r.certificate_number || '',
      r.item_serials?.date_of_first_used || '',
      r.calibration_date || '',
      r.due_date || '',
      r.item_serials?.location_area || '',
      r.calibration_by || '',
      r.scope_of_instruments || '',
      r.acceptance_tolerance || '',
      r.judgement || '',
      r.remark || '',
      r.is_external ? 'Ya' : 'Tidak',
      statusLabel[r.item_serials?.equipment_status]?.text || 'Aktif',
    ])

    const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'masterlist-kalibrasi.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <p style={{ padding: 20 }}>Memuat data...</p>

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Masterlist Kalibrasi</h2>
        <button
          onClick={exportCSV}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8,
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Download size={15} /> Export Masterlist
        </button>
      </div>

      {records.length === 0 && <p>Belum ada data yang final approved.</p>}

      {records.length > 0 && (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Type/Model</th>
              <th style={thStyle}>Merk/Brand</th>
              <th style={thStyle}>Range</th>
              <th style={thStyle}>Unit</th>
              <th style={thStyle}>Serial No.</th>
              <th style={thStyle}>Certificate Number</th>
              <th style={thStyle}>Date of First Used</th>
              <th style={thStyle}>Calibration Date</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Location (Area)</th>
              <th style={thStyle}>Calibration By</th>
              <th style={thStyle}>Scope of Instruments</th>
              <th style={thStyle}>Acceptance Tolerance</th>
              <th style={thStyle}>Judgement</th>
              <th style={thStyle}>Remark</th>
              <th style={thStyle}>Eksternal</th>
              <th style={thStyle}>Status Alat</th>
              <th style={thStyle}>Riwayat</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, index) => {
              const status = r.item_serials?.equipment_status || 'active'
              const label = statusLabel[status] || statusLabel.active
              return (
                <tr key={r.id}>
                  <td style={tdStyle}>{index + 1}</td>
                  <td style={tdStyle}>{r.item_serials?.items?.item_name}</td>
                  <td style={tdStyle}>{r.item_serials?.items?.type_model}</td>
                  <td style={tdStyle}>{r.item_serials?.items?.merk_brand}</td>
                  <td style={tdStyle}>{r.range}</td>
                  <td style={tdStyle}>{r.unit}</td>
                  <td style={tdStyle}>{r.item_serials?.serial_no}</td>
                  <td style={tdStyle}>
  {r.certificate_url ? (
    <a href={r.certificate_url} target="_blank" rel="noreferrer">{r.certificate_number}</a>
  ) : (r.certificate_number || '-')}
</td>
                  <td style={tdStyle}>{r.item_serials?.date_of_first_used || '-'}</td>
                  <td style={tdStyle}>{r.calibration_date}</td>
                  <td style={tdStyle}>{r.due_date}</td>
                  <td style={tdStyle}>{r.item_serials?.location_area}</td>
                  <td style={tdStyle}>{r.calibration_by}</td>
                  <td style={tdStyle}>{r.scope_of_instruments}</td>
                  <td style={tdStyle}>{r.acceptance_tolerance}</td>
                  <td style={tdStyle}>{r.judgement}</td>
                  <td style={tdStyle}>{r.remark || '-'}</td>
                  <td style={tdStyle}>{r.is_external ? 'Ya' : 'Tidak'}</td>
                  <td style={tdStyle}>
                    {canManageStatus ? (
                      <select
                        value={status}
                        onChange={(e) => handleStatusChange(r.item_serials?.id, e.target.value)}
                        style={{ padding: 4, borderRadius: 4, border: '1px solid #ccc' }}
                      >
                        <option value="active">Aktif</option>
                        <option value="damaged">Rusak</option>
                        <option value="lost">Hilang</option>
                        <option value="retired">Tidak Dipakai</option>
                      </select>
                    ) : (
                      <span style={{ color: label.color, background: label.bg, padding: '2px 8px', borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                        {label.text}
                      </span>
                    )}
                  </td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setHistoryTarget({
                        serialId: r.item_serials?.id,
                        itemName: r.item_serials?.items?.item_name,
                        serialNo: r.item_serials?.serial_no,
                      })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px',
                        background: '#fff', border: '1px solid #ccc', borderRadius: 6, cursor: 'pointer', fontSize: 12,
                      }}
                    >
                      <History size={13} /> Riwayat
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {historyTarget && (
        <HistoryModal
          serialId={historyTarget.serialId}
          itemName={historyTarget.itemName}
          serialNo={historyTarget.serialNo}
          onClose={() => setHistoryTarget(null)}
        />
      )}
    </div>
  )
}
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Download, History, X, Search } from 'lucide-react'

const thStyle = { border: '1px solid #ccc', padding: 8, background: '#f0f0f0', textAlign: 'left', whiteSpace: 'nowrap', position: 'sticky', top: 0, zIndex: 2 }
const filterThStyle = { border: '1px solid #ccc', padding: 4, background: '#fafafa', verticalAlign: 'top' }
const tdStyle = { border: '1px solid #ccc', padding: 8, whiteSpace: 'nowrap' }
const filterSelectStyle = { width: '100%', maxWidth: 140, padding: '4px 4px', fontSize: 12, border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }
const dateFilterStackStyle = { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 90, maxWidth: 100 }

const monthNamesId = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

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

// Kolom biasa: dropdown 1 tingkat, isinya nilai unik dari data
const FILTERABLE_COLUMNS = [
  { key: 'item_name', label: 'Item', getValue: (r) => r.item_serials?.items?.item_name },
  { key: 'type_model', label: 'Type/Model', getValue: (r) => r.item_serials?.items?.type_model },
  { key: 'merk_brand', label: 'Merk/Brand', getValue: (r) => r.item_serials?.items?.merk_brand },
  { key: 'range', label: 'Range', getValue: (r) => r.range },
  { key: 'unit', label: 'Unit', getValue: (r) => r.unit },
  { key: 'serial_no', label: 'Serial No.', getValue: (r) => r.item_serials?.serial_no },
  { key: 'certificate_number', label: 'Certificate Number', getValue: (r) => r.certificate_number },
  { key: 'location_area', label: 'Location (Area)', getValue: (r) => r.item_serials?.location_area },
  { key: 'calibration_by', label: 'Calibration By', getValue: (r) => r.calibration_by },
  { key: 'scope_of_instruments', label: 'Scope of Instruments', getValue: (r) => r.scope_of_instruments },
  { key: 'acceptance_tolerance', label: 'Acceptance Tolerance', getValue: (r) => r.acceptance_tolerance },
  { key: 'judgement', label: 'Judgement', getValue: (r) => r.judgement },
  { key: 'remark', label: 'Remark', getValue: (r) => r.remark },
  { key: 'is_external', label: 'Eksternal', getValue: (r) => (r.is_external ? 'Ya' : 'Tidak') },
  { key: 'equipment_status', label: 'Status Alat', getValue: (r) => statusLabel[r.item_serials?.equipment_status || 'active']?.text },
]

// Kolom tanggal: dropdown bertingkat Tahun -> Bulan -> Tanggal
const DATE_COLUMNS = [
  { key: 'date_of_first_used', label: 'Date of First Used', getValue: (r) => r.item_serials?.date_of_first_used },
  { key: 'calibration_date', label: 'Calibration Date', getValue: (r) => r.calibration_date },
  { key: 'due_date', label: 'Due Date', getValue: (r) => r.due_date },
]

function getDateParts(dateStr) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return null
  return { y, m, d }
}

function buildDateOptions(records, getValue, filterState) {
  const years = new Set()
  const months = new Set()
  const days = new Set()
  records.forEach((r) => {
    const parts = getDateParts(getValue(r))
    if (!parts) return
    years.add(parts.y)
    if (!filterState?.year || filterState.year === parts.y) {
      months.add(parts.m)
      if (!filterState?.month || filterState.month === parts.m) {
        days.add(parts.d)
      }
    }
  })
  return {
    years: Array.from(years).sort(),
    months: Array.from(months).sort(),
    days: Array.from(days).sort(),
  }
}

function matchesDateFilter(dateStr, filter) {
  if (!filter || (!filter.year && !filter.month && !filter.day)) return true
  const parts = getDateParts(dateStr)
  if (!parts) return false
  if (filter.year && filter.year !== parts.y) return false
  if (filter.month && filter.month !== parts.m) return false
  if (filter.day && filter.day !== parts.d) return false
  return true
}

function DateFilterCell({ col, records, filterState, onChange }) {
  const options = buildDateOptions(records, col.getValue, filterState)
  const current = filterState || {}

  return (
    <div style={dateFilterStackStyle}>
      <select
        style={filterSelectStyle}
        value={current.year || ''}
        onChange={(e) => onChange(col.key, { year: e.target.value, month: '', day: '' })}
      >
        <option value="">Tahun</option>
        {options.years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        style={filterSelectStyle}
        value={current.month || ''}
        onChange={(e) => onChange(col.key, { ...current, month: e.target.value, day: '' })}
        disabled={!current.year}
      >
        <option value="">Bulan</option>
        {options.months.map((m) => <option key={m} value={m}>{monthNamesId[parseInt(m, 10) - 1]}</option>)}
      </select>
      <select
        style={filterSelectStyle}
        value={current.day || ''}
        onChange={(e) => onChange(col.key, { ...current, day: e.target.value })}
        disabled={!current.month}
      >
        <option value="">Tanggal</option>
        {options.days.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
    </div>
  )
}

function HistoryModal({ serialId, itemName, serialNo, onClose }) {
  const [history, setHistory] = useState([])
  const [equipmentInfo, setEquipmentInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const [historyRes, serialRes] = await Promise.all([
        supabase
          .from('calibration_records')
          .select('id, calibration_date, due_date, status, judgement, certificate_number, certificate_url, remark, qc_notes, is_external')
          .eq('item_serial_id', serialId)
          .order('calibration_date', { ascending: false }),
        supabase
          .from('item_serials')
          .select('equipment_status, status_note, equipment_status_changed_at')
          .eq('id', serialId)
          .single(),
      ])

      if (!historyRes.error) setHistory(historyRes.data)
      if (!serialRes.error) setEquipmentInfo(serialRes.data)
      setLoading(false)
    }
    load()
  }, [serialId])

  const statusLabelMap = {
    damaged: { text: 'Rusak', color: '#B3261E', bg: '#FBEAEA' },
    lost: { text: 'Hilang', color: '#8A8F8D', bg: '#EEF0EF' },
    retired: { text: 'Tidak Dipakai', color: '#8A8F8D', bg: '#EEF0EF' },
  }

  const currentStatus = equipmentInfo?.equipment_status
  const statusChangeInfo = currentStatus && currentStatus !== 'active' ? statusLabelMap[currentStatus] : null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 900, width: '90%', maxHeight: '80vh', overflowY: 'auto', fontFamily: 'Inter, sans-serif' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Riwayat Kalibrasi — {itemName} (SN: {serialNo})</h3>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8F8D' }} onClick={onClose}><X size={20} /></button>
        </div>

        {!loading && statusChangeInfo && (
          <div style={{
            background: statusChangeInfo.bg, color: statusChangeInfo.color,
            border: '1px solid #E4E9E7', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13,
          }}>
            ⚠️ Status alat: <b>{statusChangeInfo.text}</b>
            {equipmentInfo?.equipment_status_changed_at && (
              <> — sejak {new Date(equipmentInfo.equipment_status_changed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</>
            )}
            {equipmentInfo?.status_note && <> · Catatan: {equipmentInfo.status_note}</>}
          </div>
        )}

        {loading ? (
          <p>Memuat riwayat...</p>
        ) : history.length === 0 ? (
          <p>Belum ada riwayat kalibrasi untuk alat ini.</p>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, position: 'static' }}>Tanggal Kalibrasi</th>
                <th style={{ ...thStyle, position: 'static' }}>Due Date</th>
                <th style={{ ...thStyle, position: 'static' }}>Status</th>
                <th style={{ ...thStyle, position: 'static' }}>Judgement</th>
                <th style={{ ...thStyle, position: 'static' }}>No. Sertifikat</th>
                <th style={{ ...thStyle, position: 'static' }}>Eksternal</th>
                <th style={{ ...thStyle, position: 'static' }}>Catatan</th>
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
                      <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 999, display: 'inline-block', color: label.color, background: label.bg }}>{label.text}</span>
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
  const [searchQuery, setSearchQuery] = useState('')
  const [columnFilters, setColumnFilters] = useState({})
  const [dateFilters, setDateFilters] = useState({})
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

  function handleColumnFilterChange(key, value) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }))
  }

  function handleDateFilterChange(key, value) {
    setDateFilters((prev) => ({ ...prev, [key]: value }))
  }

  function clearAllFilters() {
    setSearchQuery('')
    setColumnFilters({})
    setDateFilters({})
  }

  function exportCSV() {
    const header = [
      'No', 'Item', 'Type/Model', 'Merk/Brand', 'Range', 'Unit', 'Serial No.',
      'Certificate Number', 'Date of First Used', 'Calibration Date', 'Due Date',
      'Location (Area)', 'Calibration By', 'Scope of Instruments',
      'Acceptance Tolerance', 'Judgement', 'Remark', 'Eksternal', 'Status Alat',
    ]

    const rows = filteredRecords.map((r, index) => [
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

  const columnOptions = {}
  FILTERABLE_COLUMNS.forEach((col) => {
    const values = new Set()
    records.forEach((r) => {
      const v = col.getValue(r)
      if (v) values.add(v)
    })
    columnOptions[col.key] = Array.from(values).sort((a, b) => a.localeCompare(b))
  })

  const q = searchQuery.trim().toLowerCase()
  const filteredRecords = records.filter((r) => {
    if (q !== '') {
      const haystack = [
        r.item_serials?.items?.item_name,
        r.item_serials?.items?.type_model,
        r.item_serials?.items?.merk_brand,
        r.item_serials?.serial_no,
        r.item_serials?.location_area,
        r.certificate_number,
      ].filter(Boolean).join(' ').toLowerCase()
      if (!haystack.includes(q)) return false
    }

    for (const col of FILTERABLE_COLUMNS) {
      const filterVal = columnFilters[col.key]
      if (!filterVal) continue
      const cellVal = col.getValue(r) || ''
      if (cellVal !== filterVal) return false
    }

    for (const col of DATE_COLUMNS) {
      if (!matchesDateFilter(col.getValue(r), dateFilters[col.key])) return false
    }

    return true
  })

  const activeDateFilterCount = Object.values(dateFilters).filter((f) => f && (f.year || f.month || f.day)).length
  const activeFilterCount = Object.values(columnFilters).filter(Boolean).length + activeDateFilterCount + (q ? 1 : 0)

  if (loading) return <p style={{ padding: 20 }}>Memuat data...</p>

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', height: '100vh', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0 }}>Masterlist Kalibrasi</h2>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #ccc', borderRadius: 8, padding: '6px 12px', background: '#fff' }}>
            <Search size={15} color="#8A8F8D" />
            <input
              placeholder="Cari alat, serial, lokasi, sertifikat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: 13, width: 220 }}
            />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearAllFilters} style={{ fontSize: 12, color: '#B3261E', background: 'none', border: '1px solid #F2C9C9', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
              Hapus semua filter ({activeFilterCount})
            </button>
          )}
          <button
            onClick={exportCSV}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
              background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <Download size={15} /> Export Masterlist
          </button>
        </div>
      </div>

      <p style={{ fontSize: 13, color: '#8A8F8D', margin: '0 0 8px 0' }}>
        Menampilkan {filteredRecords.length} dari {records.length} data
      </p>

      {records.length === 0 && <p>Belum ada data yang final approved.</p>}

      {records.length > 0 && (
        <div style={{ flex: 1, overflow: 'auto', border: '1px solid #ddd', borderRadius: 6 }}>
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
              <tr>
                <th style={filterThStyle}></th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.item_name || ''} onChange={(e) => handleColumnFilterChange('item_name', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.item_name.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.type_model || ''} onChange={(e) => handleColumnFilterChange('type_model', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.type_model.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.merk_brand || ''} onChange={(e) => handleColumnFilterChange('merk_brand', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.merk_brand.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.range || ''} onChange={(e) => handleColumnFilterChange('range', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.range.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.unit || ''} onChange={(e) => handleColumnFilterChange('unit', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.unit.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.serial_no || ''} onChange={(e) => handleColumnFilterChange('serial_no', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.serial_no.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.certificate_number || ''} onChange={(e) => handleColumnFilterChange('certificate_number', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.certificate_number.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <DateFilterCell col={DATE_COLUMNS[0]} records={records} filterState={dateFilters.date_of_first_used} onChange={handleDateFilterChange} />
                </th>
                <th style={filterThStyle}>
                  <DateFilterCell col={DATE_COLUMNS[1]} records={records} filterState={dateFilters.calibration_date} onChange={handleDateFilterChange} />
                </th>
                <th style={filterThStyle}>
                  <DateFilterCell col={DATE_COLUMNS[2]} records={records} filterState={dateFilters.due_date} onChange={handleDateFilterChange} />
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.location_area || ''} onChange={(e) => handleColumnFilterChange('location_area', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.location_area.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.calibration_by || ''} onChange={(e) => handleColumnFilterChange('calibration_by', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.calibration_by.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.scope_of_instruments || ''} onChange={(e) => handleColumnFilterChange('scope_of_instruments', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.scope_of_instruments.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.acceptance_tolerance || ''} onChange={(e) => handleColumnFilterChange('acceptance_tolerance', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.acceptance_tolerance.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.judgement || ''} onChange={(e) => handleColumnFilterChange('judgement', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.judgement.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.remark || ''} onChange={(e) => handleColumnFilterChange('remark', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.remark.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.is_external || ''} onChange={(e) => handleColumnFilterChange('is_external', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.is_external.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}>
                  <select style={filterSelectStyle} value={columnFilters.equipment_status || ''} onChange={(e) => handleColumnFilterChange('equipment_status', e.target.value)}>
                    <option value="">Semua</option>
                    {columnOptions.equipment_status.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </th>
                <th style={filterThStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, index) => {
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
                    <td style={tdStyle}>{r.certificate_number || '-'}</td>
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
        </div>
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
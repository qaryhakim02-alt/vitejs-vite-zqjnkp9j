import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Download, Upload, XCircle } from 'lucide-react'

const styles = {
  wrap: { fontFamily: 'Inter, sans-serif', background: '#EEF2F0', minHeight: '100vh', padding: '28px 32px' },
  title: { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7371', marginBottom: 20 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E4E9E7', padding: 20, marginBottom: 20 },
  cardTitle: { fontWeight: 700, marginBottom: 10 },
  btn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#fff', color: '#1B2422', border: '1px solid #D6DCDA', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 },
  th: { border: '1px solid #E4E9E7', padding: 6, background: '#F5F7F6', textAlign: 'left', whiteSpace: 'nowrap' },
  td: { border: '1px solid #E4E9E7', padding: 6, whiteSpace: 'nowrap' },
  resultRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 },
  progressBarOuter: { background: '#EEF0EF', borderRadius: 999, height: 8, marginTop: 10, overflow: 'hidden' },
  progressBarInner: { background: '#3FA796', height: '100%', transition: 'width 0.2s' },
}

const TEMPLATE_HEADERS = [
  'item_name', 'type_model', 'merk_brand', 'range', 'unit', 'serial_no', 'asset_tag',
  'location_area', 'date_of_first_used', 'certificate_number', 'calibration_date', 'due_date',
  'calibration_by', 'scope_of_instruments', 'acceptance_tolerance', 'judgement', 'remark',
]

// Parser CSV yang benar: memproses karakter satu-satu, jadi aman walau ada sel
// yang isinya mengandung baris baru (asal terbungkus tanda kutip ganda).
function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let i = 0

  while (i < text.length) {
    const char = text[i]

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue }
        inQuotes = false; i++; continue
      }
      field += char; i++; continue
    }

    if (char === '"') { inQuotes = true; i++; continue }
    if (char === ',') { row.push(field); field = ''; i++; continue }
    if (char === '\r') { i++; continue }
    if (char === '\n') { row.push(field); field = ''; rows.push(row); row = []; i++; continue }
    field += char; i++
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }

  const nonEmptyRows = rows.filter((r) => r.some((v) => v.trim() !== ''))
  if (nonEmptyRows.length === 0) return []

  const headers = nonEmptyRows[0].map((h) => h.trim())
  return nonEmptyRows.slice(1).map((values) => {
    const obj = {}
    headers.forEach((h, idx) => { obj[h] = (values[idx] || '').trim() })
    return obj
  })
}

function normalizeJudgement(val) {
  const v = (val || '').toLowerCase()
  if (v.includes('tidak') || v === 'fail') return 'fail'
  if (v.includes('catatan') || v === 'conditional') return 'conditional'
  return 'pass'
}

function cleanValue(val) {
  if (!val || val.trim() === '' || val.trim() === '-') return null
  return val.trim()
}

// Khusus untuk kolom tanggal: kalau isinya teks tanpa angka sama sekali
// (misal "NEW", "TBD", "-"), anggap kosong daripada bikin database error.
function cleanDate(val) {
  const v = cleanValue(val)
  if (!v) return null
  if (!/\d/.test(v)) return null
  return v
}

async function processRow(row, profile) {
  try {
    if (!row.item_name) {
      throw new Error('Nama Alat wajib diisi')
    }

    const hasValidSerial = row.serial_no && row.serial_no !== '-'
    let itemId, itemSerialId

    if (hasValidSerial) {
      const { data: existingSerial } = await supabase
        .from('item_serials')
        .select('id, item_id')
        .eq('serial_no', row.serial_no)
        .maybeSingle()

      if (existingSerial) {
        itemId = existingSerial.item_id
        itemSerialId = existingSerial.id
      }
    }

    if (!itemSerialId) {
      const { data: newItem, error: itemError } = await supabase
        .from('items')
        .insert({ item_name: row.item_name, type_model: row.type_model, merk_brand: row.merk_brand })
        .select().single()
      if (itemError) throw itemError
      itemId = newItem.id

      const { data: newSerial, error: serialError } = await supabase
        .from('item_serials')
        .insert({
          item_id: itemId, serial_no: row.serial_no || null, asset_tag: row.asset_tag,
          date_of_first_used: cleanDate(row.date_of_first_used), location_area: row.location_area,
        })
        .select().single()
      if (serialError) throw serialError
      itemSerialId = newSerial.id
    }

    const calibrationDate = cleanDate(row.calibration_date)

    const recordPayload = {
      item_serial_id: itemSerialId,
      scope_of_instruments: row.scope_of_instruments,
      range: row.range, unit: row.unit,
      acceptance_tolerance: row.acceptance_tolerance,
      certificate_number: row.certificate_number || null,
      calibration_date: calibrationDate,
      due_date: cleanDate(row.due_date),
      calibration_by: row.calibration_by || profile.full_name,
      judgement: normalizeJudgement(row.judgement),
      remark: row.remark,
      is_external: false,
      status: 'approved',
      created_by: profile.id,
      reviewed_by: profile.id,
      approved_by: profile.id,
    }

    let existingRecordId = null
    if (calibrationDate) {
      const { data: existingRecord } = await supabase
        .from('calibration_records')
        .select('id')
        .eq('item_serial_id', itemSerialId)
        .eq('calibration_date', calibrationDate)
        .eq('status', 'approved')
        .maybeSingle()
      existingRecordId = existingRecord?.id || null
    }

    if (existingRecordId) {
      const { error: updateError } = await supabase
        .from('calibration_records')
        .update(recordPayload)
        .eq('id', existingRecordId)
      if (updateError) throw updateError
      return { success: true, action: 'updated' }
    } else {
      const { error: recordError } = await supabase
        .from('calibration_records')
        .insert(recordPayload)
      if (recordError) throw recordError
      return { success: true, action: 'created' }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

export default function ImportDataAwal({ profile }) {
  const [rows, setRows] = useState([])
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState(null)
  const canImport = profile.role === 'admin'

  function downloadTemplate() {
    const example = [
      'Caliper', 'CD-6"CX', 'Mitutoyo', '0-150mm', 'mm', 'SN-001', 'AST-001',
      'QC Lab', '2024-01-15', 'CAL-2025-EXT-001', '2025-06-01', '2026-06-01',
      'Nama Kalibrator', 'Panjang', '± 0.02mm', 'pass', 'Data migrasi dari sistem lama',
    ]
    const csv = [TEMPLATE_HEADERS.join(','), example.map((v) => `"${v}"`).join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'template-import-data-awal.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const parsed = parseCSV(evt.target.result)
      setRows(parsed)
      setResults(null)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    setImporting(true)
    setResults([])

    const batchSize = 15
    const allResults = []

    for (let start = 0; start < rows.length; start += batchSize) {
      const batch = rows.slice(start, start + batchSize)
      const batchResults = await Promise.all(
        batch.map(async (row, idx) => {
          const res = await processRow(row, profile)
          return { row: start + idx + 2, item: row.item_name || '(nama kosong)', ...res }
        })
      )
      allResults.push(...batchResults)
      setResults([...allResults])
    }

    setImporting(false)
  }

  if (!canImport) {
    return <div style={styles.wrap}><p>🔒 Halaman ini hanya untuk Admin.</p></div>
  }

  const processedCount = results ? results.length : 0
  const createdCount = results ? results.filter((r) => r.success && r.action === 'created').length : 0
  const updatedCount = results ? results.filter((r) => r.success && r.action === 'updated').length : 0
  const failCount = results ? results.filter((r) => !r.success).length : 0
  const progressPct = rows.length > 0 ? Math.round((processedCount / rows.length) * 100) : 0

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Import Data Awal</h1>
      <div style={styles.subtitle}>
        Untuk memasukkan banyak alat sekaligus yang kalibrasinya sudah valid. Data langsung berstatus disetujui tanpa perlu review QC. Upload ulang file yang sama aman — data yang sama (alat + tanggal kalibrasi) akan diperbarui, bukan dobel.
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Langkah 1 — Download Template</div>
        <p style={{ fontSize: 13, color: '#6B7371', marginBottom: 10 }}>
          Isi template ini di Excel, jangan ubah nama kolomnya. Simpan sebagai CSV (File → Save As → CSV UTF-8).
        </p>
        <button style={styles.btnSecondary} onClick={downloadTemplate}>
          <Download size={15} /> Download Template CSV
        </button>
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Langkah 2 — Upload File CSV yang Sudah Diisi</div>
        <input type="file" accept=".csv" onChange={handleFileUpload} />
        {rows.length > 0 && (
          <>
            <p style={{ fontSize: 13, marginTop: 10 }}>Terbaca <b>{rows.length}</b> baris data. Preview 5 baris pertama:</p>
            <div style={{ overflowX: 'auto' }}>
              <table style={styles.table}>
                <thead>
                  <tr>{TEMPLATE_HEADERS.map((h) => <th key={h} style={styles.th}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>{TEMPLATE_HEADERS.map((h) => <td key={h} style={styles.td}>{r[h] || '-'}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Langkah 3 — Import</div>
          <button style={styles.btn} onClick={handleImport} disabled={importing}>
            <Upload size={15} /> {importing ? `Mengimpor... (${processedCount}/${rows.length})` : `Import ${rows.length} Data Sekarang`}
          </button>

          {importing && (
            <div style={styles.progressBarOuter}>
              <div style={{ ...styles.progressBarInner, width: `${progressPct}%` }} />
            </div>
          )}

          {results && !importing && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 700 }}>
                Selesai: <span style={{ color: '#1C7A63' }}>{createdCount} data baru</span>
                {updatedCount > 0 && <> , <span style={{ color: '#3FA796' }}>{updatedCount} diperbarui</span></>}
                {failCount > 0 && <> , <span style={{ color: '#B3261E' }}>{failCount} gagal</span></>}
              </p>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {results.filter((r) => !r.success).map((r, i) => (
                  <div key={i} style={styles.resultRow}>
                    <XCircle size={14} color="#B3261E" />
                    Baris {r.row} ({r.item}): {r.error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
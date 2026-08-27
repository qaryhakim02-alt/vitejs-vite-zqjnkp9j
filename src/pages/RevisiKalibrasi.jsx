import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, X } from 'lucide-react'

const styles = {
  wrap: { fontFamily: 'Inter, sans-serif', background: '#EEF2F0', minHeight: '100vh', padding: '28px 32px' },
  title: { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7371', marginBottom: 24 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E4E9E7', padding: 20, marginBottom: 16 },
  itemName: { fontSize: 16, fontWeight: 700 },
  itemSub: { fontSize: 13, color: '#8A8F8D', marginBottom: 8 },
  qcNote: { background: '#FBEAEA', border: '1px solid #F2C9C9', borderRadius: 8, padding: 12, marginTop: 8, marginBottom: 12 },
  qcNoteLabel: { fontSize: 12, fontWeight: 700, color: '#B3261E', marginBottom: 4 },
  fixBtn: { background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  lockedNote: { color: '#8A8F8D', fontSize: 13, fontStyle: 'italic' },
  section: { fontSize: 13, color: '#3FA796', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', margin: '20px 0 10px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: '#1B2422' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, background: '#fff' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontSize: 14, background: '#fff' },
  textarea: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontSize: 14, minHeight: 70, background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: { textAlign: 'left', fontSize: 11, color: '#8A8F8D', fontWeight: 700, textTransform: 'uppercase', padding: '8px 10px', background: '#F5F7F6', border: '1px solid #E4E9E7' },
  td: { padding: 6, border: '1px solid #E4E9E7' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #D6DCDA', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10 },
  submitBtn: { background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 20 },
  cancelBtn: { background: 'none', border: 'none', color: '#6B7371', fontSize: 14, cursor: 'pointer', marginLeft: 16, marginTop: 20 },
}

function Field({ label, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
    </div>
  )
}

function emptyPoint() {
  return { point_label: '', standard_value: '', reading_value: '', uncertainty: '', note: '' }
}

export default function RevisiKalibrasi({ profile }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingRecord, setEditingRecord] = useState(null)

  async function loadRecords() {
    setLoading(true)
    const { data, error } = await supabase
      .from('calibration_records')
      .select(`
        id, created_by, qc_notes, is_external,
        scope_of_instruments, range, unit, calibration_date, due_date,
        item_serials ( id, item_id, serial_no, asset_tag, location_area, date_of_first_used,
          items ( id, item_name, type_model, merk_brand )
        )
      `)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })

    if (!error) setRecords(data)
    setLoading(false)
  }

  useEffect(() => {
    loadRecords()
  }, [])

  if (editingRecord) {
    return (
      <EditForm
        record={editingRecord}
        profile={profile}
        onDone={() => {
          setEditingRecord(null)
          loadRecords()
        }}
        onCancel={() => setEditingRecord(null)}
      />
    )
  }

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Perlu Diperbaiki</h1>
      <div style={styles.subtitle}>Data kalibrasi yang dikembalikan QC untuk diperbaiki dan diajukan ulang.</div>

      {loading ? (
        <p>Memuat data...</p>
      ) : records.length === 0 ? (
        <p style={{ color: '#8A8F8D' }}>Tidak ada data yang perlu diperbaiki.</p>
      ) : (
        records.map((r) => {
          const canFix = r.created_by === profile.id
          return (
            <div key={r.id} style={styles.card}>
              <div style={styles.itemName}>{r.item_serials?.items?.item_name}</div>
              <div style={styles.itemSub}>
                {r.item_serials?.items?.type_model} — {r.item_serials?.items?.merk_brand} | Serial: {r.item_serials?.serial_no}
              </div>
              <div style={styles.qcNote}>
                <div style={styles.qcNoteLabel}>⚠️ Catatan QC</div>
                <div>{r.qc_notes || 'Tidak ada catatan spesifik dari QC.'}</div>
              </div>
              {canFix ? (
                <button style={styles.fixBtn} onClick={() => setEditingRecord(r)}>✏️ Perbaiki & Ajukan Ulang</button>
              ) : (
                <p style={styles.lockedNote}>🔒 Hanya pembuat data ini yang bisa memperbaiki.</p>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function EditForm({ record, profile, onDone, onCancel }) {
  const item = record.item_serials?.items || {}
  const serial = record.item_serials || {}

  const [form, setForm] = useState({
    item_name: item.item_name || '',
    merk_brand: item.merk_brand || '',
    range: record.range || '',
    type_model: item.type_model || '',
    serial_no: serial.serial_no || '',
    asset_tag: serial.asset_tag || '',
    location_area: serial.location_area || '',
    date_of_first_used: serial.date_of_first_used || '',
    scope_of_instruments: record.scope_of_instruments || '',
    unit: record.unit || '',
    calibration_date: record.calibration_date || '',
    due_date: record.due_date || '',
    is_external: record.is_external || false,
  })
  const [points, setPoints] = useState([emptyPoint()])
  const [loadingPoints, setLoadingPoints] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function loadPoints() {
      const { data } = await supabase
        .from('calibration_measurement_points')
        .select('*')
        .eq('calibration_record_id', record.id)
        .order('sort_order', { ascending: true })
      if (data && data.length > 0) {
        setPoints(data.map((p) => ({
          point_label: p.point_label || '', standard_value: p.standard_value ?? '',
          reading_value: p.reading_value ?? '', uncertainty: p.uncertainty ?? '', note: p.note || '',
        })))
      }
      setLoadingPoints(false)
    }
    loadPoints()
  }, [record.id])

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handlePointChange(index, field, value) {
    setPoints((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  function addPoint() {
    setPoints((prev) => [...prev, emptyPoint()])
  }

  function removePoint(index) {
    setPoints((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      const { error: itemError } = await supabase
        .from('items')
        .update({ item_name: form.item_name, type_model: form.type_model, merk_brand: form.merk_brand })
        .eq('id', item.id)
      if (itemError) throw itemError

      const { error: serialError } = await supabase
        .from('item_serials')
        .update({
          serial_no: form.serial_no, asset_tag: form.asset_tag,
          date_of_first_used: form.date_of_first_used || null, location_area: form.location_area,
        })
        .eq('id', serial.id)
      if (serialError) throw serialError

      const { error: recordError } = await supabase
        .from('calibration_records')
        .update({
          scope_of_instruments: form.scope_of_instruments,
          range: form.range, unit: form.unit,
          calibration_date: form.calibration_date || null,
          due_date: form.due_date || null,
          is_external: form.is_external,
          status: 'review',
        })
        .eq('id', record.id)
      if (recordError) throw recordError

      await supabase.from('calibration_measurement_points').delete().eq('calibration_record_id', record.id)

      const pointRows = points
        .filter((p) => p.point_label || p.standard_value || p.reading_value)
        .map((p, i) => ({
          calibration_record_id: record.id,
          point_label: p.point_label,
          standard_value: p.standard_value || null,
          reading_value: p.reading_value || null,
          uncertainty: p.uncertainty || null,
          note: p.note,
          sort_order: i,
        }))

      if (pointRows.length > 0) {
        const { error: pointsError } = await supabase.from('calibration_measurement_points').insert(pointRows)
        if (pointsError) throw pointsError
      }

      setMessage('✅ Data berhasil diperbaiki dan diajukan ulang ke QC.')
      setTimeout(onDone, 1000)
    } catch (err) {
      setMessage('❌ Gagal menyimpan: ' + err.message)
      setSaving(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Perbaiki Kalibrasi</h1>
      <div style={styles.qcNote}>
        <div style={styles.qcNoteLabel}>⚠️ Catatan QC</div>
        <div>{record.qc_notes || 'Tidak ada catatan spesifik dari QC.'}</div>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={styles.section}>Informasi Alat</div>
        <div style={styles.grid}>
          <Field label="Nama Alat *">
            <input style={styles.input} required value={form.item_name} onChange={(e) => handleChange('item_name', e.target.value)} />
          </Field>
          <Field label="Merk">
            <input style={styles.input} value={form.merk_brand} onChange={(e) => handleChange('merk_brand', e.target.value)} />
          </Field>
          <Field label="Range">
            <input style={styles.input} value={form.range} onChange={(e) => handleChange('range', e.target.value)} />
          </Field>
          <Field label="Model / Tipe">
            <input style={styles.input} value={form.type_model} onChange={(e) => handleChange('type_model', e.target.value)} />
          </Field>
          <Field label="No. Seri">
            <input style={styles.input} value={form.serial_no} onChange={(e) => handleChange('serial_no', e.target.value)} />
          </Field>
          <Field label="ID Aset / No. Tag">
            <input style={styles.input} value={form.asset_tag} onChange={(e) => handleChange('asset_tag', e.target.value)} />
          </Field>
          <Field label="Lokasi">
            <input style={styles.input} value={form.location_area} onChange={(e) => handleChange('location_area', e.target.value)} />
          </Field>
          <Field label="Tanggal Pertama Digunakan">
            <input type="date" style={styles.input} value={form.date_of_first_used} onChange={(e) => handleChange('date_of_first_used', e.target.value)} />
          </Field>
          <Field label="Scope / Ruang Lingkup">
            <input style={styles.input} value={form.scope_of_instruments} onChange={(e) => handleChange('scope_of_instruments', e.target.value)} />
          </Field>
          <Field label="Unit">
            <input style={styles.input} value={form.unit} onChange={(e) => handleChange('unit', e.target.value)} />
          </Field>
        </div>

        <div style={styles.section}>Informasi Kalibrasi</div>
        <div style={styles.grid}>
          <Field label="Tanggal Kalibrasi">
            <input type="date" style={styles.input} value={form.calibration_date} onChange={(e) => handleChange('calibration_date', e.target.value)} />
          </Field>
          <Field label="Tanggal Jatuh Tempo">
            <input type="date" style={styles.input} value={form.due_date} onChange={(e) => handleChange('due_date', e.target.value)} />
          </Field>
        </div>

        <div style={styles.section}>Hasil Pengukuran</div>
        {loadingPoints ? <p>Memuat titik ukur...</p> : (
          <>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Titik Ukur</th>
                  <th style={styles.th}>Nilai Standar</th>
                  <th style={styles.th}>Nilai Terbaca</th>
                  <th style={styles.th}>Ketidakpastian</th>
                  <th style={styles.th}>Keterangan</th>
                  <th style={styles.th}></th>
                </tr>
              </thead>
              <tbody>
                {points.map((p, i) => (
                  <tr key={i}>
                    <td style={styles.td}><input style={{ ...styles.input, width: '100%' }} value={p.point_label} onChange={(e) => handlePointChange(i, 'point_label', e.target.value)} /></td>
                    <td style={styles.td}><input type="number" step="0.01" style={{ ...styles.input, width: '100%' }} value={p.standard_value} onChange={(e) => handlePointChange(i, 'standard_value', e.target.value)} /></td>
                    <td style={styles.td}><input type="number" step="0.01" style={{ ...styles.input, width: '100%' }} value={p.reading_value} onChange={(e) => handlePointChange(i, 'reading_value', e.target.value)} /></td>
                    <td style={styles.td}><input type="number" step="0.01" style={{ ...styles.input, width: '100%' }} value={p.uncertainty} onChange={(e) => handlePointChange(i, 'uncertainty', e.target.value)} /></td>
                    <td style={styles.td}><input style={{ ...styles.input, width: '100%' }} value={p.note} onChange={(e) => handlePointChange(i, 'note', e.target.value)} /></td>
                    <td style={styles.td}>
                      {points.length > 1 && (
                        <button type="button" onClick={() => removePoint(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8A8F8D' }}>
                          <X size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" style={styles.addBtn} onClick={addPoint}>
              <Plus size={14} /> Tambah Titik Ukur
            </button>
          </>
        )}

        {message && <p style={{ marginTop: 16 }}>{message}</p>}
        <div>
          <button type="submit" disabled={saving} style={styles.submitBtn}>
            {saving ? 'Menyimpan...' : 'Ajukan Ulang ke QC'}
          </button>
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>Batal</button>
        </div>
      </form>
    </div>
  )
}
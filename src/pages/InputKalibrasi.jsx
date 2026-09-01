import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Plus, X, Search, CheckCircle2 } from 'lucide-react'

const styles = {
  wrap: { fontFamily: 'Inter, sans-serif', background: '#EEF2F0', minHeight: '100vh', padding: '28px 32px' },
  back: { fontSize: 13, color: '#3FA796', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none', padding: 0, marginBottom: 8 },
  title: { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 24px 0' },
  section: { fontSize: 13, color: '#3FA796', fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', margin: '24px 0 12px 0' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 700, color: '#1B2422', letterSpacing: '0.02em' },
  hint: { fontSize: 11, color: '#8A8F8D' },
  input: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, background: '#fff' },
  select: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontFamily: 'Inter, sans-serif', fontSize: 14, background: '#fff' },
  textarea: { padding: '10px 12px', borderRadius: 8, border: '1px solid #D6DCDA', fontFamily: 'Inter, sans-serif', fontSize: 14, minHeight: 70, background: '#fff' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: { textAlign: 'left', fontSize: 11, color: '#8A8F8D', fontWeight: 700, textTransform: 'uppercase', padding: '8px 10px', background: '#F5F7F6', border: '1px solid #E4E9E7' },
  td: { padding: 6, border: '1px solid #E4E9E7' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #D6DCDA', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10 },
  submitRow: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 },
  submitBtn: { display: 'flex', alignItems: 'center', gap: 8, background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
  cancelBtn: { background: 'none', border: 'none', color: '#6B7371', fontSize: 14, cursor: 'pointer' },
  searchBox: { background: '#fff', border: '1px solid #D6DCDA', borderRadius: 8, padding: 16, marginBottom: 20 },
  searchInputRow: { display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #D6DCDA', borderRadius: 8, padding: '8px 12px' },
  searchResults: { marginTop: 10, border: '1px solid #E4E9E7', borderRadius: 8, overflow: 'hidden' },
  searchResultItem: { padding: '10px 12px', borderBottom: '1px solid #F0F2F1', cursor: 'pointer', fontSize: 13 },
  selectedBox: { display: 'flex', alignItems: 'center', gap: 8, background: '#E2F3EE', border: '1px solid #B7DED2', borderRadius: 8, padding: '10px 14px', marginTop: 10, fontSize: 13 },
  clearLink: { marginLeft: 'auto', color: '#3FA796', fontWeight: 600, cursor: 'pointer', background: 'none', border: 'none' },
  lockedBox: { background: '#FBF1DD', border: '1px solid #F0DFAD', borderRadius: 8, padding: 12, marginTop: 16, fontSize: 13 },
  extBox: { background: '#FBF1DD', padding: 16, borderRadius: 8, marginTop: 12 },
}

const modeConfig = {
  new: {
    title: 'Input Kalibrasi Baru',
    subtitle: 'Untuk alat yang baru pertama kali masuk sistem.',
    showSearch: false,
    requireExisting: false,
    forceExternal: false,
    allowedRole: 'teknisi',
    showEnvFields: true,
    showMeasurementPoints: true,
  },
  re: {
    title: 'Re-Kalibrasi Alat',
    subtitle: 'Cari alat yang sudah ada berdasarkan serial number, lalu perbarui data kalibrasinya.',
    showSearch: true,
    requireExisting: true,
    forceExternal: false,
    allowedRole: 'teknisi',
    showEnvFields: true,
    showMeasurementPoints: true,
  },
  external: {
    title: 'Input Kalibrasi Eksternal',
    subtitle: 'Input data alat dan sertifikat dari laboratorium eksternal/supplier.',
    showSearch: true,
    requireExisting: false,
    forceExternal: true,
    allowedRole: 'admin',
    showEnvFields: false,
    showMeasurementPoints: false,
  },
}

function emptyPoint() {
  return { point_label: '', standard_value: '', reading_value: '', uncertainty: '', note: '' }
}

function Field({ label, hint, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
      {hint && <span style={styles.hint}>{hint}</span>}
    </div>
  )
}

export default function InputKalibrasi({ profile, onNavigate, mode = 'new' }) {
  const cfg = modeConfig[mode] || modeConfig.new
  const canSubmit = profile.role === cfg.allowedRole
  const today = new Date().toISOString().slice(0, 10)
  const nextYear = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10)

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState(null)

  const [form, setForm] = useState({
    item_name: '', merk_brand: '', range: '', type_model: '',
    serial_no: '', asset_tag: '', location_area: '', date_of_first_used: '',
    scope_of_instruments: '', unit: '',
    certificate_number_draft: '', calibration_date: today, due_date: nextYear,
    reference_method: '', room_temperature: '', humidity: '', lab_name: '',
    calibration_by_manual: '',
    judgement: 'pass', remark: '',
  })
  const [points, setPoints] = useState([emptyPoint()])
  const [externalCertNumber, setExternalCertNumber] = useState('')
  const [externalCertFile, setExternalCertFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSearch(query) {
    setSearchQuery(query)
    if (query.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    const { data, error } = await supabase
      .from('item_serials')
      .select('id, item_id, serial_no, asset_tag, location_area, date_of_first_used, items ( item_name, type_model, merk_brand )')
      .ilike('serial_no', `%${query}%`)
      .limit(6)

    if (!error) setSearchResults(data)
    setSearching(false)
  }

  function selectExisting(result) {
    setSelected({ itemSerialId: result.id, itemId: result.item_id })
    setForm((prev) => ({
      ...prev,
      item_name: result.items?.item_name || '',
      merk_brand: result.items?.merk_brand || '',
      type_model: result.items?.type_model || '',
      serial_no: result.serial_no || '',
      asset_tag: result.asset_tag || '',
      location_area: result.location_area || '',
      date_of_first_used: result.date_of_first_used || '',
    }))
    setSearchQuery('')
    setSearchResults([])
  }

  function clearSelection() {
    setSelected(null)
    setForm((prev) => ({
      ...prev,
      item_name: '', merk_brand: '', type_model: '',
      serial_no: '', asset_tag: '', location_area: '', date_of_first_used: '',
    }))
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

  function resetForm() {
    setForm({
      item_name: '', merk_brand: '', range: '', type_model: '',
      serial_no: '', asset_tag: '', location_area: '', date_of_first_used: '',
      scope_of_instruments: '', unit: '',
      certificate_number_draft: '', calibration_date: today, due_date: nextYear,
      reference_method: '', room_temperature: '', humidity: '', lab_name: '',
      calibration_by_manual: '',
      judgement: 'pass', remark: '',
    })
    setPoints([emptyPoint()])
    setSelected(null)
    setExternalCertNumber('')
    setExternalCertFile(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (cfg.requireExisting && !selected) {
      setMessage('❌ Untuk Re-Kalibrasi, pilih dulu alat dari hasil pencarian di atas.')
      return
    }

    setLoading(true)
    setMessage('')

    try {
      let itemId = selected?.itemId
      let itemSerialId = selected?.itemSerialId

      if (selected) {
        const { error: itemError } = await supabase
          .from('items')
          .update({ item_name: form.item_name, type_model: form.type_model, merk_brand: form.merk_brand })
          .eq('id', itemId)
        if (itemError) throw itemError

        const { error: serialError } = await supabase
          .from('item_serials')
          .update({
            serial_no: form.serial_no, asset_tag: form.asset_tag,
            date_of_first_used: form.date_of_first_used || null, location_area: form.location_area,
          })
          .eq('id', itemSerialId)
        if (serialError) throw serialError
      } else {
        const { data: item, error: itemError } = await supabase
          .from('items')
          .insert({ item_name: form.item_name, type_model: form.type_model, merk_brand: form.merk_brand })
          .select().single()
        if (itemError) throw itemError
        itemId = item.id

        const { data: serial, error: serialError } = await supabase
          .from('item_serials')
          .insert({
            item_id: itemId, serial_no: form.serial_no, asset_tag: form.asset_tag,
            date_of_first_used: form.date_of_first_used || null, location_area: form.location_area,
          })
          .select().single()
        if (serialError) throw serialError
        itemSerialId = serial.id
      }

      let externalCertUrl = null
      if (cfg.forceExternal && externalCertFile) {
        const fileExt = externalCertFile.name.split('.').pop()
        const fileName = `external-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('certificates').upload(fileName, externalCertFile)
        if (uploadError) throw uploadError
        const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(fileName)
        externalCertUrl = urlData.publicUrl
      }

      const { data: record, error: recordError } = await supabase
        .from('calibration_records')
        .insert({
          item_serial_id: itemSerialId,
          scope_of_instruments: form.scope_of_instruments,
          range: form.range, unit: form.unit,
          certificate_number_draft: form.certificate_number_draft,
          certificate_number: cfg.forceExternal ? externalCertNumber : null,
          certificate_url: externalCertUrl,
          calibration_date: form.calibration_date || null,
          due_date: form.due_date || null,
          reference_method: form.reference_method,
          room_temperature: form.room_temperature || null,
          humidity: form.humidity || null,
          calibration_by: cfg.forceExternal ? form.calibration_by_manual : profile.full_name,
          lab_name: form.lab_name,
          is_external: cfg.forceExternal,
          judgement: form.judgement,
          remark: form.remark,
          status: 'review',
          created_by: profile.id,
        })
        .select().single()
      if (recordError) throw recordError

      if (cfg.showMeasurementPoints) {
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
      }

      setMessage('✅ Data kalibrasi berhasil disimpan dan diajukan untuk persetujuan.')
      resetForm()
    } catch (err) {
      setMessage('❌ Gagal menyimpan: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.wrap}>
      <button style={styles.back} onClick={() => onNavigate && onNavigate('dashboard')}>← Kembali</button>
      <h1 style={styles.title}>{cfg.title}</h1>
      <p style={{ color: '#6B7371', marginTop: -16, marginBottom: 20, fontSize: 14 }}>{cfg.subtitle}</p>

      {!canSubmit && (
        <div style={styles.lockedBox}>
          🔒 Halaman ini hanya bisa diisi oleh role <b>{cfg.allowedRole}</b>. Anda hanya bisa melihat tampilannya.
        </div>
      )}

      {cfg.showSearch && (
        <div style={styles.searchBox}>
          <label style={styles.label}>
            Cari Alat yang Sudah Ada (berdasarkan Serial Number) {cfg.requireExisting && '*wajib dipilih'}
          </label>
          <div style={styles.searchInputRow}>
            <Search size={16} color="#8A8F8D" />
            <input
              style={{ border: 'none', outline: 'none', flex: 1, fontSize: 14, fontFamily: 'IBM Plex Mono, monospace' }}
              placeholder="Ketik serial number..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              disabled={!!selected}
            />
          </div>

          {searching && <p style={{ fontSize: 12, color: '#8A8F8D', marginTop: 8 }}>Mencari...</p>}

          {searchResults.length > 0 && (
            <div style={styles.searchResults}>
              {searchResults.map((r) => (
                <div key={r.id} style={styles.searchResultItem} onClick={() => selectExisting(r)}>
                  <b>{r.items?.item_name}</b> — SN: {r.serial_no} ({r.items?.merk_brand}, {r.location_area || '-'})
                </div>
              ))}
            </div>
          )}

          {selected && (
            <div style={styles.selectedBox}>
              <CheckCircle2 size={16} color="#1C7A63" />
              Menggunakan alat yang sudah ada: <b>{form.item_name}</b> (SN: {form.serial_no})
              {!cfg.requireExisting && (
                <button type="button" style={styles.clearLink} onClick={clearSelection}>Batal, input alat baru</button>
              )}
            </div>
          )}

          <p style={styles.hint}>
            {cfg.requireExisting
              ? 'Alat harus dipilih dari hasil pencarian di atas sebelum bisa submit.'
              : 'Kalau alat tidak ditemukan, langsung isi form di bawah sebagai alat baru.'}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={styles.section}>Informasi Alat</div>
        <div style={styles.grid}>
          <Field label="Nama Alat *">
            <input style={styles.input} required value={form.item_name} onChange={(e) => handleChange('item_name', e.target.value)} disabled={cfg.requireExisting && !selected} />
          </Field>
          <Field label="Merk">
            <input style={styles.input} value={form.merk_brand} onChange={(e) => handleChange('merk_brand', e.target.value)} disabled={cfg.requireExisting && !selected} />
          </Field>
          <Field label="Range">
            <input style={styles.input} value={form.range} onChange={(e) => handleChange('range', e.target.value)} />
          </Field>
          <Field label="Model / Tipe">
            <input style={styles.input} value={form.type_model} onChange={(e) => handleChange('type_model', e.target.value)} disabled={cfg.requireExisting && !selected} />
          </Field>
          <Field label="No. Seri">
            <input style={styles.input} value={form.serial_no} onChange={(e) => handleChange('serial_no', e.target.value)} disabled={cfg.requireExisting && !selected} />
          </Field>
          <Field label="ID Aset / No. Tag">
            <input style={styles.input} value={form.asset_tag} onChange={(e) => handleChange('asset_tag', e.target.value)} disabled={cfg.requireExisting && !selected} />
          </Field>
          <Field label="Lokasi">
            <input style={styles.input} value={form.location_area} onChange={(e) => handleChange('location_area', e.target.value)} disabled={cfg.requireExisting && !selected} />
          </Field>
          <Field label="Tanggal Pertama Digunakan">
            <input type="date" style={styles.input} value={form.date_of_first_used} onChange={(e) => handleChange('date_of_first_used', e.target.value)} disabled={cfg.requireExisting && !selected} />
          </Field>
          <Field label="Scope / Ruang Lingkup">
            <input style={styles.input} placeholder="Mis. massa, panjang" value={form.scope_of_instruments} onChange={(e) => handleChange('scope_of_instruments', e.target.value)} />
          </Field>
          <Field label="Unit">
            <input style={styles.input} placeholder="g, mm" value={form.unit} onChange={(e) => handleChange('unit', e.target.value)} />
          </Field>
        </div>

        <div style={styles.section}>Informasi Kalibrasi</div>
        <div style={styles.grid}>
          {!cfg.forceExternal && (
            <Field label="No. Sertifikat" hint="Nomor final ditetapkan saat generate certificate">
              <input style={styles.input} placeholder="Otomatis saat generate" value={form.certificate_number_draft} onChange={(e) => handleChange('certificate_number_draft', e.target.value)} />
            </Field>
          )}
          <Field label="Tanggal Kalibrasi">
            <input type="date" style={styles.input} value={form.calibration_date} onChange={(e) => handleChange('calibration_date', e.target.value)} />
          </Field>
          <Field label="Tanggal Jatuh Tempo">
            <input type="date" style={styles.input} value={form.due_date} onChange={(e) => handleChange('due_date', e.target.value)} />
          </Field>

          {cfg.showEnvFields && (
            <>
              <Field label="Metode / Standar Acuan">
                <input style={styles.input} placeholder="Mis. OIML R76" value={form.reference_method} onChange={(e) => handleChange('reference_method', e.target.value)} />
              </Field>
              <Field label="Suhu Ruangan (°C)">
                <input type="number" step="0.1" style={styles.input} value={form.room_temperature} onChange={(e) => handleChange('room_temperature', e.target.value)} />
              </Field>
              <Field label="Kelembaban (%RH)">
                <input type="number" step="1" style={styles.input} value={form.humidity} onChange={(e) => handleChange('humidity', e.target.value)} />
              </Field>
            </>
          )}

          <Field label="Input Oleh" hint="Terisi otomatis dari akun Anda">
            <input style={styles.input} value={profile.full_name || ''} disabled />
          </Field>

          {cfg.forceExternal && (
            <Field label="Calibration By" hint="Nama teknisi/lab eksternal yang melakukan kalibrasi">
              <input style={styles.input} required value={form.calibration_by_manual} onChange={(e) => handleChange('calibration_by_manual', e.target.value)} />
            </Field>
          )}

          {cfg.showEnvFields && (
            <Field label="Instansi / Laboratorium">
              <input style={styles.input} value={form.lab_name} onChange={(e) => handleChange('lab_name', e.target.value)} />
            </Field>
          )}
        </div>

        {cfg.forceExternal && (
          <div style={styles.extBox}>
            <div style={{ ...styles.section, margin: '0 0 12px 0' }}>Sertifikat Eksternal</div>
            <div style={styles.grid}>
              <Field label="No. Sertifikat (dari Lab Eksternal)">
                <input style={styles.input} required value={externalCertNumber} onChange={(e) => setExternalCertNumber(e.target.value)} />
              </Field>
              <Field label="Upload File Sertifikat (PDF)">
                <input type="file" accept="application/pdf,image/*" onChange={(e) => setExternalCertFile(e.target.files[0])} />
              </Field>
            </div>
          </div>
        )}

        {cfg.showMeasurementPoints && (
          <>
            <div style={styles.section}>Hasil Pengukuran</div>
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
                    <td style={styles.td}><input style={{ ...styles.input, width: '100%' }} placeholder="Opsional" value={p.note} onChange={(e) => handlePointChange(i, 'note', e.target.value)} /></td>
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

        <div style={styles.section}>Kesimpulan</div>
        <div style={{ ...styles.grid, gridTemplateColumns: '1fr' }}>
          <Field label="Hasil Akhir">
            <select style={styles.select} value={form.judgement} onChange={(e) => handleChange('judgement', e.target.value)}>
              <option value="pass">Sesuai</option>
              <option value="fail">Tidak Sesuai</option>
              <option value="conditional">Sesuai dengan Catatan</option>
            </select>
          </Field>
          <Field label="Catatan / Rekomendasi">
            <textarea style={styles.textarea} placeholder="Catatan tambahan..." value={form.remark} onChange={(e) => handleChange('remark', e.target.value)} />
          </Field>
        </div>

        {message && <p style={{ marginTop: 16 }}>{message}</p>}
        <div style={styles.submitRow}>
          <button type="submit" disabled={loading || !canSubmit} style={styles.submitBtn}>
            {loading ? 'Menyimpan...' : 'Ajukan untuk Persetujuan'}
          </button>
          <button type="button" style={styles.cancelBtn} onClick={() => onNavigate && onNavigate('dashboard')}>Batal</button>
        </div>
      </form>
    </div>
  )
}
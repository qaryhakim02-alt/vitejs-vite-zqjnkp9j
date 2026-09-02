import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Upload, CheckCircle2, XCircle } from 'lucide-react'

const styles = {
  wrap: { fontFamily: 'Inter, sans-serif', background: '#EEF2F0', minHeight: '100vh', padding: '28px 32px' },
  title: { fontFamily: 'Space Grotesk, sans-serif', fontSize: 26, fontWeight: 700, margin: '0 0 6px 0' },
  subtitle: { fontSize: 14, color: '#6B7371', marginBottom: 20 },
  card: { background: '#fff', borderRadius: 12, border: '1px solid #E4E9E7', padding: 20, marginBottom: 20 },
  cardTitle: { fontWeight: 700, marginBottom: 10 },
  btn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: '#1B2422', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  resultRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13 },
  progressBarOuter: { background: '#EEF0EF', borderRadius: 999, height: 8, marginTop: 10, overflow: 'hidden' },
  progressBarInner: { background: '#3FA796', height: '100%', transition: 'width 0.2s' },
}

async function matchAndUpload(file) {
  const baseName = file.name.replace(/\.pdf$/i, '').trim()

  try {
    const { data: byCert } = await supabase
      .from('calibration_records')
      .select('id, certificate_url')
      .eq('status', 'approved')
      .ilike('certificate_number', baseName)
      .limit(1)

    let targetRecordId = byCert?.[0]?.id

    if (!targetRecordId) {
      const { data: serial } = await supabase
        .from('item_serials')
        .select('id')
        .ilike('serial_no', baseName)
        .maybeSingle()

      if (serial) {
        const { data: records } = await supabase
          .from('calibration_records')
          .select('id, calibration_date, certificate_url')
          .eq('item_serial_id', serial.id)
          .eq('status', 'approved')
          .order('calibration_date', { ascending: false })

        const candidate = records?.find((r) => !r.certificate_url) || records?.[0]
        targetRecordId = candidate?.id
      }
    }

    if (!targetRecordId) {
      return { success: false, filename: file.name, reason: 'Tidak ditemukan data yang cocok (cek nomor sertifikat/serial number di nama file)' }
    }

    const fileExt = file.name.split('.').pop()
    const storageFileName = `bulk-${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`

    const { error: uploadError } = await supabase.storage.from('certificates').upload(storageFileName, file)
    if (uploadError) return { success: false, filename: file.name, reason: uploadError.message }

    const { data: urlData } = supabase.storage.from('certificates').getPublicUrl(storageFileName)

    const { error: updateError } = await supabase
      .from('calibration_records')
      .update({ certificate_url: urlData.publicUrl })
      .eq('id', targetRecordId)
    if (updateError) return { success: false, filename: file.name, reason: updateError.message }

    return { success: true, filename: file.name }
  } catch (err) {
    return { success: false, filename: file.name, reason: err.message }
  }
}

export default function BulkUploadSertifikat({ profile }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState(null)
  const canUpload = profile.role === 'admin'

  function handleFilesSelected(e) {
    setFiles(Array.from(e.target.files))
    setResults(null)
  }

  async function handleBulkUpload() {
    setUploading(true)
    setResults([])

    const batchSize = 5
    const allResults = []

    for (let start = 0; start < files.length; start += batchSize) {
      const batch = files.slice(start, start + batchSize)
      const batchResults = await Promise.all(batch.map((file) => matchAndUpload(file)))
      allResults.push(...batchResults)
      setResults([...allResults])
    }

    setUploading(false)
  }

  if (!canUpload) {
    return <div style={styles.wrap}><p>🔒 Halaman ini hanya untuk Admin.</p></div>
  }

  const processedCount = results ? results.length : 0
  const successCount = results ? results.filter((r) => r.success).length : 0
  const failCount = results ? results.filter((r) => !r.success).length : 0
  const progressPct = files.length > 0 ? Math.round((processedCount / files.length) * 100) : 0

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>Upload Sertifikat Massal</h1>
      <div style={styles.subtitle}>
        Pilih banyak file PDF sekaligus. Sistem otomatis mencocokkan tiap file ke data kalibrasi berdasarkan <b>nama file = nomor sertifikat atau serial number</b> (tanpa ekstensi .pdf).
        <br />Contoh: file bernama <code>CAL-2026-0004.pdf</code> akan otomatis tersambung ke data dengan nomor sertifikat <code>CAL-2026-0004</code>.
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>Pilih File PDF</div>
        <input type="file" accept="application/pdf" multiple onChange={handleFilesSelected} />
        {files.length > 0 && (
          <p style={{ fontSize: 13, marginTop: 10 }}>{files.length} file dipilih.</p>
        )}
      </div>

      {files.length > 0 && (
        <div style={styles.card}>
          <button style={styles.btn} onClick={handleBulkUpload} disabled={uploading}>
            <Upload size={15} /> {uploading ? `Memproses... (${processedCount}/${files.length})` : `Upload & Cocokkan ${files.length} File`}
          </button>

          {uploading && (
            <div style={styles.progressBarOuter}>
              <div style={{ ...styles.progressBarInner, width: `${progressPct}%` }} />
            </div>
          )}

          {results && !uploading && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontWeight: 700 }}>
                Selesai: <span style={{ color: '#1C7A63' }}>{successCount} berhasil tersambung</span>
                {failCount > 0 && <> , <span style={{ color: '#B3261E' }}>{failCount} tidak cocok</span></>}
              </p>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {results.map((r, i) => (
                  <div key={i} style={styles.resultRow}>
                    {r.success ? <CheckCircle2 size={14} color="#1C7A63" /> : <XCircle size={14} color="#B3261E" />}
                    {r.filename} {!r.success && <span style={{ color: '#8A8F8D' }}> — {r.reason}</span>}
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
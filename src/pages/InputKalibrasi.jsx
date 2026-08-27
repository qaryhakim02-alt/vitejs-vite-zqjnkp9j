import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Plus, X } from 'lucide-react';

const styles = {
  wrap: {
    fontFamily: 'Inter, sans-serif',
    background: '#EEF2F0',
    minHeight: '100vh',
    padding: '28px 32px',
  },
  back: {
    fontSize: 13,
    color: '#3FA796',
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    padding: 0,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: 26,
    fontWeight: 700,
    margin: '0 0 24px 0',
  },
  section: {
    fontSize: 13,
    color: '#3FA796',
    fontWeight: 700,
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
    margin: '24px 0 12px 0',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
  },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1B2422',
    letterSpacing: '0.02em',
  },
  hint: { fontSize: 11, color: '#8A8F8D' },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #D6DCDA',
    fontFamily: 'IBM Plex Mono, monospace',
    fontSize: 13,
    background: '#fff',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #D6DCDA',
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    background: '#fff',
  },
  textarea: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #D6DCDA',
    fontFamily: 'Inter, sans-serif',
    fontSize: 14,
    minHeight: 70,
    background: '#fff',
  },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8 },
  th: {
    textAlign: 'left',
    fontSize: 11,
    color: '#8A8F8D',
    fontWeight: 700,
    textTransform: 'uppercase',
    padding: '8px 10px',
    background: '#F5F7F6',
    border: '1px solid #E4E9E7',
  },
  td: { padding: 6, border: '1px solid #E4E9E7' },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#fff',
    border: '1px solid #D6DCDA',
    borderRadius: 8,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 10,
  },
  submitRow: { display: 'flex', alignItems: 'center', gap: 16, marginTop: 28 },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: '#1B2422',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 20px',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'none',
    border: 'none',
    color: '#6B7371',
    fontSize: 14,
    cursor: 'pointer',
  },
};

function emptyPoint() {
  return {
    point_label: '',
    standard_value: '',
    reading_value: '',
    uncertainty: '',
    note: '',
  };
}

function Field({ label, hint, children }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      {children}
      {hint && <span style={styles.hint}>{hint}</span>}
    </div>
  );
}

export default function InputKalibrasi({ profile, onNavigate }) {
  const canSubmit = profile.role === 'teknisi' || profile.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);
  const nextYear = new Date(
    new Date().setFullYear(new Date().getFullYear() + 1)
  )
    .toISOString()
    .slice(0, 10);

  const [form, setForm] = useState({
    item_name: '',
    merk_brand: '',
    range: '',
    type_model: '',
    serial_no: '',
    asset_tag: '',
    location_area: '',
    date_of_first_used: '',
    scope_of_instruments: '',
    unit: '',
    certificate_number_draft: '',
    calibration_date: today,
    due_date: nextYear,
    reference_method: '',
    room_temperature: '',
    humidity: '',
    lab_name: '',
    is_external: false,
    judgement: 'pass',
    remark: '',
  });
  const [points, setPoints] = useState([emptyPoint()]);
  const [externalCertNumber, setExternalCertNumber] = useState('');
  const [externalCertFile, setExternalCertFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handlePointChange(index, field, value) {
    setPoints((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
  }

  function addPoint() {
    setPoints((prev) => [...prev, emptyPoint()]);
  }

  function removePoint(index) {
    setPoints((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data: item, error: itemError } = await supabase
        .from('items')
        .insert({
          item_name: form.item_name,
          type_model: form.type_model,
          merk_brand: form.merk_brand,
        })
        .select()
        .single();
      if (itemError) throw itemError;

      const { data: serial, error: serialError } = await supabase
        .from('item_serials')
        .insert({
          item_id: item.id,
          serial_no: form.serial_no,
          asset_tag: form.asset_tag,
          date_of_first_used: form.date_of_first_used || null,
          location_area: form.location_area,
        })
        .select()
        .single();
      if (serialError) throw serialError;
      let externalCertUrl = null;
      if (form.is_external && externalCertFile) {
        const fileExt = externalCertFile.name.split('.').pop();
        const fileName = `external-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('certificates')
          .upload(fileName, externalCertFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('certificates')
          .getPublicUrl(fileName);
        externalCertUrl = urlData.publicUrl;
      }
      const { data: record, error: recordError } = await supabase
        .from('calibration_records')
        .insert({
          item_serial_id: serial.id,
          scope_of_instruments: form.scope_of_instruments,
          range: form.range,
          unit: form.unit,
          certificate_number_draft: form.certificate_number_draft,
          calibration_date: form.calibration_date || null,
          due_date: form.due_date || null,
          reference_method: form.reference_method,
          room_temperature: form.room_temperature || null,
          humidity: form.humidity || null,
          calibration_by: profile.full_name,
          lab_name: form.lab_name,
          is_external: form.is_external,
          judgement: form.judgement,
          remark: form.remark,
          certificate_number: form.is_external ? externalCertNumber : null,
          certificate_url: externalCertUrl,
          status: 'review',
          created_by: profile.id,
        })
        .select()
        .single();
      if (recordError) throw recordError;

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
        }));

      if (pointRows.length > 0) {
        const { error: pointsError } = await supabase
          .from('calibration_measurement_points')
          .insert(pointRows);
        if (pointsError) throw pointsError;
      }

      setMessage(
        '✅ Data kalibrasi berhasil disimpan dan diajukan untuk persetujuan.'
      );
      setForm({
        item_name: '',
        merk_brand: '',
        range: '',
        type_model: '',
        serial_no: '',
        asset_tag: '',
        location_area: '',
        date_of_first_used: '',
        scope_of_instruments: '',
        unit: '',
        certificate_number_draft: '',
        calibration_date: today,
        due_date: nextYear,
        reference_method: '',
        room_temperature: '',
        humidity: '',
        lab_name: '',
        is_external: false,
        judgement: 'pass',
        remark: '',
      });
      setPoints([emptyPoint()]);
    } catch (err) {
      setMessage('❌ Gagal menyimpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.wrap}>
      <button
        style={styles.back}
        onClick={() => onNavigate && onNavigate('dashboard')}
      >
        ← Rekaman Baru
      </button>
      <h1 style={styles.title}>Input Hasil Kalibrasi</h1>

      <form onSubmit={handleSubmit}>
        <div style={styles.section}>Informasi Alat</div>
        <div style={styles.grid}>
          <Field label="Nama Alat *">
            <input
              style={styles.input}
              required
              value={form.item_name}
              onChange={(e) => handleChange('item_name', e.target.value)}
            />
          </Field>
          <Field label="Merk">
            <input
              style={styles.input}
              value={form.merk_brand}
              onChange={(e) => handleChange('merk_brand', e.target.value)}
            />
          </Field>
          <Field label="Range">
            <input
              style={styles.input}
              value={form.range}
              onChange={(e) => handleChange('range', e.target.value)}
            />
          </Field>
          <Field label="Model / Tipe">
            <input
              style={styles.input}
              value={form.type_model}
              onChange={(e) => handleChange('type_model', e.target.value)}
            />
          </Field>
          <Field label="No. Seri">
            <input
              style={styles.input}
              value={form.serial_no}
              onChange={(e) => handleChange('serial_no', e.target.value)}
            />
          </Field>
          <Field label="ID Aset / No. Tag">
            <input
              style={styles.input}
              value={form.asset_tag}
              onChange={(e) => handleChange('asset_tag', e.target.value)}
            />
          </Field>
          <Field label="Lokasi">
            <input
              style={styles.input}
              value={form.location_area}
              onChange={(e) => handleChange('location_area', e.target.value)}
            />
          </Field>
          <Field label="Tanggal Pertama Digunakan">
            <input
              type="date"
              style={styles.input}
              value={form.date_of_first_used}
              onChange={(e) =>
                handleChange('date_of_first_used', e.target.value)
              }
            />
          </Field>
          <Field label="Scope / Ruang Lingkup">
            <input
              style={styles.input}
              placeholder="Mis. massa, panjang"
              value={form.scope_of_instruments}
              onChange={(e) =>
                handleChange('scope_of_instruments', e.target.value)
              }
            />
          </Field>
          <Field label="Unit">
            <input
              style={styles.input}
              placeholder="g, mm"
              value={form.unit}
              onChange={(e) => handleChange('unit', e.target.value)}
            />
          </Field>
        </div>

        <div style={styles.section}>Informasi Kalibrasi</div>
        <div style={styles.grid}>
          <Field
            label="No. Sertifikat"
            hint="Nomor final ditetapkan saat approval"
          >
            <input
              style={styles.input}
              placeholder="Otomatis saat approval"
              value={form.certificate_number_draft}
              onChange={(e) =>
                handleChange('certificate_number_draft', e.target.value)
              }
            />
          </Field>
          <Field label="Tanggal Kalibrasi">
            <input
              type="date"
              style={styles.input}
              value={form.calibration_date}
              onChange={(e) => handleChange('calibration_date', e.target.value)}
            />
          </Field>
          <Field label="Tanggal Jatuh Tempo">
            <input
              type="date"
              style={styles.input}
              value={form.due_date}
              onChange={(e) => handleChange('due_date', e.target.value)}
            />
          </Field>
          <Field label="Metode / Standar Acuan">
            <input
              style={styles.input}
              placeholder="Mis. OIML R76"
              value={form.reference_method}
              onChange={(e) => handleChange('reference_method', e.target.value)}
            />
          </Field>
          <Field label="Suhu Ruangan (°C)">
            <input
              type="number"
              step="0.1"
              style={styles.input}
              value={form.room_temperature}
              onChange={(e) => handleChange('room_temperature', e.target.value)}
            />
          </Field>
          <Field label="Kelembaban (%RH)">
            <input
              type="number"
              step="1"
              style={styles.input}
              value={form.humidity}
              onChange={(e) => handleChange('humidity', e.target.value)}
            />
          </Field>
          <Field
            label="Nama Teknisi / Kalibrator"
            hint="Terisi otomatis dari akun Anda"
          >
            <input
              style={styles.input}
              value={profile.full_name || ''}
              disabled
            />
          </Field>
          <Field label="Instansi / Laboratorium">
            <input
              style={styles.input}
              value={form.lab_name}
              onChange={(e) => handleChange('lab_name', e.target.value)}
            />
          </Field>
        </div>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <input
            type="checkbox"
            checked={form.is_external}
            onChange={(e) => handleChange('is_external', e.target.checked)}
          />
          Kalibrasi Eksternal
        </label>

        {form.is_external && (
          <div
            style={{
              ...styles.grid,
              marginTop: 12,
              background: '#FBF1DD',
              padding: 16,
              borderRadius: 8,
            }}
          >
            <Field label="No. Sertifikat (dari Lab Eksternal)">
              <input
                style={styles.input}
                required
                value={externalCertNumber}
                onChange={(e) => setExternalCertNumber(e.target.value)}
              />
            </Field>
            <Field label="Upload File Sertifikat (PDF)">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setExternalCertFile(e.target.files[0])}
              />
            </Field>
          </div>
        )}

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
                <td style={styles.td}>
                  <input
                    style={{ ...styles.input, width: '100%' }}
                    value={p.point_label}
                    onChange={(e) =>
                      handlePointChange(i, 'point_label', e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...styles.input, width: '100%' }}
                    value={p.standard_value}
                    onChange={(e) =>
                      handlePointChange(i, 'standard_value', e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...styles.input, width: '100%' }}
                    value={p.reading_value}
                    onChange={(e) =>
                      handlePointChange(i, 'reading_value', e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    type="number"
                    step="0.01"
                    style={{ ...styles.input, width: '100%' }}
                    value={p.uncertainty}
                    onChange={(e) =>
                      handlePointChange(i, 'uncertainty', e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  <input
                    style={{ ...styles.input, width: '100%' }}
                    placeholder="Opsional"
                    value={p.note}
                    onChange={(e) =>
                      handlePointChange(i, 'note', e.target.value)
                    }
                  />
                </td>
                <td style={styles.td}>
                  {points.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePoint(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#8A8F8D',
                      }}
                    >
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

        <div style={styles.section}>Kesimpulan</div>
        <div style={{ ...styles.grid, gridTemplateColumns: '1fr' }}>
          <Field label="Hasil Akhir">
            <select
              style={styles.select}
              value={form.judgement}
              onChange={(e) => handleChange('judgement', e.target.value)}
            >
              <option value="pass">Sesuai</option>
              <option value="fail">Tidak Sesuai</option>
              <option value="conditional">Sesuai dengan Catatan</option>
            </select>
          </Field>
          <Field label="Catatan / Rekomendasi">
            <textarea
              style={styles.textarea}
              placeholder="Catatan tambahan..."
              value={form.remark}
              onChange={(e) => handleChange('remark', e.target.value)}
            />
          </Field>
        </div>

        {!canSubmit && (
          <p
            style={{
              marginTop: 16,
              background: '#FBF1DD',
              padding: 12,
              borderRadius: 8,
              fontSize: 13,
            }}
          >
            🔒 Anda hanya bisa melihat form ini. Role Anda tidak memiliki akses
            untuk mengajukan kalibrasi baru.
          </p>
        )}
        {message && <p style={{ marginTop: 16 }}>{message}</p>}
        <div style={styles.submitRow}>
          <button
            type="submit"
            disabled={loading || !canSubmit}
            style={styles.submitBtn}
          >
            {loading ? 'Menyimpan...' : 'Ajukan untuk Persetujuan'}
          </button>
          <button
            type="button"
            style={styles.cancelBtn}
            onClick={() => onNavigate && onNavigate('dashboard')}
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

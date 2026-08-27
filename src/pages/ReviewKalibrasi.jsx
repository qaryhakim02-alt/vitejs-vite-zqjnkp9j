import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function ReviewKalibrasi({ profile }) {
  const canApprove = profile.role === 'qc';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notesDraft, setNotesDraft] = useState({});

  async function loadRecords() {
    setLoading(true);
    const { data, error } = await supabase
      .from('calibration_records')
      .select(
        `
        id, scope_of_instruments, range, unit, acceptance_tolerance,
        calibration_date, due_date, calibration_by, is_external,
        judgement, remark, status, certificate_number, certificate_url,
        reference_method, room_temperature, humidity, lab_name,
        item_serials (
          serial_no, location_area, asset_tag,
          items ( item_name, type_model, merk_brand )
        ),
        calibration_measurement_points ( point_label, standard_value, reading_value, uncertainty, note )
      `
      )
      .eq('status', 'review')
      .order('created_at', { ascending: true });

    if (!error) setRecords(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function handleApprove(id) {
    await supabase
      .from('calibration_records')
      .update({
        status: 'approved',
        reviewed_by: profile.id,
        qc_notes: notesDraft[id] || null,
      })
      .eq('id', id);
    loadRecords();
  }

  async function handleReject(id) {
    await supabase
      .from('calibration_records')
      .update({
        status: 'draft',
        reviewed_by: profile.id,
        qc_notes: notesDraft[id] || null,
      })
      .eq('id', id);
    loadRecords();
  }

  if (loading) return <p style={{ padding: 20 }}>Memuat data...</p>;

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 8,
    fontSize: 13,
  };
  const thStyle = {
    border: '1px solid #ddd',
    padding: 6,
    background: '#f5f5f5',
    textAlign: 'left',
  };
  const tdStyle = { border: '1px solid #ddd', padding: 6 };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Review Kalibrasi</h2>
      {records.length === 0 && <p>Tidak ada data yang menunggu review.</p>}

      {records.map((r) => (
        <div
          key={r.id}
          style={{
            border: '1px solid #ccc',
            borderRadius: 6,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <b>{r.item_serials?.items?.item_name}</b> —{' '}
          {r.item_serials?.items?.type_model} (
          {r.item_serials?.items?.merk_brand})
          <p style={{ margin: '4px 0' }}>
            Serial: {r.item_serials?.serial_no} | Aset:{' '}
            {r.item_serials?.asset_tag || '-'} | Lokasi:{' '}
            {r.item_serials?.location_area}
          </p>
          <p style={{ margin: '4px 0' }}>
            Scope: {r.scope_of_instruments} | Range: {r.range} | Unit: {r.unit}
          </p>
          <p style={{ margin: '4px 0' }}>
            Metode/Standar: {r.reference_method || '-'} | Suhu:{' '}
            {r.room_temperature ?? '-'}°C | RH: {r.humidity ?? '-'}%
          </p>
          <p style={{ margin: '4px 0' }}>
            Tanggal Kalibrasi: {r.calibration_date} | Due: {r.due_date}
          </p>
          <p style={{ margin: '4px 0' }}>
            Judgement: <b>{r.judgement}</b> | Eksternal:{' '}
            {r.is_external ? 'Ya' : 'Tidak'}
          </p>
          {r.is_external && (
            <p
              style={{ margin: '4px 0', color: '#b45309', fontWeight: 'bold' }}
            >
              ⚠️ Kalibrasi Eksternal — No. Sertifikat:{' '}
              {r.certificate_number || '-'}
              {r.certificate_url && (
                <>
                  {' '}
                  |{' '}
                  <a href={r.certificate_url} target="_blank" rel="noreferrer">
                    Lihat file sertifikat
                  </a>
                </>
              )}
            </p>
          )}
          <p style={{ margin: '4px 0' }}>Remark Teknisi: {r.remark || '-'}</p>
          {r.calibration_measurement_points?.length > 0 && (
            <>
              <b>Hasil Pengukuran:</b>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Titik Ukur</th>
                    <th style={thStyle}>Nilai Standar</th>
                    <th style={thStyle}>Nilai Terbaca</th>
                    <th style={thStyle}>Ketidakpastian</th>
                    <th style={thStyle}>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {r.calibration_measurement_points.map((p, i) => (
                    <tr key={i}>
                      <td style={tdStyle}>{p.point_label || '-'}</td>
                      <td style={tdStyle}>{p.standard_value ?? '-'}</td>
                      <td style={tdStyle}>{p.reading_value ?? '-'}</td>
                      <td style={tdStyle}>{p.uncertainty ?? '-'}</td>
                      <td style={tdStyle}>{p.note || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <label style={{ display: 'block', marginTop: 8, fontWeight: 'bold' }}>
            Catatan QC (opsional)
          </label>
          <textarea
            style={{ width: '100%', padding: 8, marginBottom: 8 }}
            value={notesDraft[r.id] || ''}
            onChange={(e) =>
              setNotesDraft((prev) => ({ ...prev, [r.id]: e.target.value }))
            }
          />
          {canApprove ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleApprove(r.id)}
                style={{ padding: '8px 16px' }}
              >
                ✅ Approve (Final)
              </button>
              <button
                onClick={() => handleReject(r.id)}
                style={{ padding: '8px 16px' }}
              >
                ↩️ Kembalikan ke Teknisi
              </button>
            </div>
          ) : (
            <p style={{ color: '#8A8F8D', fontSize: 13, fontStyle: 'italic' }}>
              🔒 Hanya QC yang dapat melakukan approval di sini.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

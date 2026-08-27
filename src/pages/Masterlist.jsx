import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Download } from 'lucide-react';

const thStyle = {
  border: '1px solid #ccc',
  padding: 8,
  background: '#f0f0f0',
  textAlign: 'left',
  whiteSpace: 'nowrap',
};
const tdStyle = { border: '1px solid #ccc', padding: 8, whiteSpace: 'nowrap' };

export default function Masterlist() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  function exportCSV() {
    const header = [
      'No',
      'Item',
      'Type/Model',
      'Merk/Brand',
      'Range',
      'Unit',
      'Serial No.',
      'Certificate Number',
      'Date of First Used',
      'Calibration Date',
      'Due Date',
      'Location (Area)',
      'Calibration By',
      'Scope of Instruments',
      'Acceptance Tolerance',
      'Judgement',
      'Remark',
      'Eksternal',
    ];

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
    ]);

    const escapeCsv = (val) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = [header, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'masterlist-kalibrasi.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    async function loadRecords() {
      setLoading(true);
      const { data, error } = await supabase
        .from('calibration_records')
        .select(
          `
          id, range, unit, acceptance_tolerance, scope_of_instruments,
          calibration_date, due_date, calibration_by, is_external,
          certificate_number, certificate_url, judgement, remark,
          item_serials (
            serial_no, location_area, date_of_first_used,
            items ( item_name, type_model, merk_brand )
          )
        `
        )
        .eq('status', 'approved')
        .order('due_date', { ascending: true });

      if (!error) setRecords(data);
      setLoading(false);
    }
    loadRecords();
  }, []);

  if (loading) return <p style={{ padding: 20 }}>Memuat data...</p>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', overflowX: 'auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h2 style={{ margin: 0 }}>Masterlist Kalibrasi</h2>
        <button
          onClick={exportCSV}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 14px',
            background: '#1B2422',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Download size={15} /> Export Masterlist
        </button>
      </div>
      {records.length === 0 && <p>Belum ada data yang final approved.</p>}

      {records.length > 0 && (
        <table
          style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}
        >
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
            </tr>
          </thead>
          <tbody>
            {records.map((r, index) => (
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
                    <a
                      href={r.certificate_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {r.certificate_number}
                    </a>
                  ) : (
                    r.certificate_number || '-'
                  )}
                </td>
                <td style={tdStyle}>
                  {r.item_serials?.date_of_first_used || '-'}
                </td>
                <td style={tdStyle}>{r.calibration_date}</td>
                <td style={tdStyle}>{r.due_date}</td>
                <td style={tdStyle}>{r.item_serials?.location_area}</td>
                <td style={tdStyle}>{r.calibration_by}</td>
                <td style={tdStyle}>{r.scope_of_instruments}</td>
                <td style={tdStyle}>{r.acceptance_tolerance}</td>
                <td style={tdStyle}>{r.judgement}</td>
                <td style={tdStyle}>{r.remark || '-'}</td>
                <td style={tdStyle}>{r.is_external ? 'Ya' : 'Tidak'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

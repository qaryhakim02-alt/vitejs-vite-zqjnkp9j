import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Approve({ profile }) {
  const canGenerate = profile.role === 'admin';
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  async function loadRecords() {
    setLoading(true);
    const { data, error } = await supabase
      .from('calibration_records')
      .select(
        `
        id, scope_of_instruments, range, unit, acceptance_tolerance,
        calibration_date, due_date, calibration_by, is_external,
        judgement, remark, qc_notes, status, certificate_number,
        item_serials (
          serial_no, location_area,
          items ( item_name, type_model, merk_brand )
        )
      `
      )
      .eq('status', 'approved')
      .eq('is_external', false)
      .is('certificate_number', null)
      .order('created_at', { ascending: true });

    if (!error) setRecords(data);
    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function generateCertificateNumber() {
    const year = new Date().getFullYear();
    const prefix = `CAL-${year}-`;
    const { count } = await supabase
      .from('calibration_records')
      .select('id', { count: 'exact', head: true })
      .ilike('certificate_number', `${prefix}%`);
    const nextNumber = (count || 0) + 1;
    return `${prefix}${String(nextNumber).padStart(4, '0')}`;
  }

  async function loadImageAsDataURL(url) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function generateCertificatePDF(record, certNumber) {
    const doc = new jsPDF();
    const logoDataUrl = await loadImageAsDataURL('/logo.png');
    if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 15, 10, 30, 30);

    doc.setFontSize(16);
    doc.text('SERTIFIKAT KALIBRASI', 105, 25, { align: 'center' });
    doc.setFontSize(10);
    doc.text('CALIBRATION CERTIFICATE', 105, 31, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`No. Sertifikat: ${certNumber}`, 15, 50);

    autoTable(doc, {
      startY: 58,
      theme: 'grid',
      styles: { fontSize: 9 },
      body: [
        ['Nama Alat', record.item_serials?.items?.item_name || '-'],
        ['Type/Model', record.item_serials?.items?.type_model || '-'],
        ['Merk/Brand', record.item_serials?.items?.merk_brand || '-'],
        ['Serial Number', record.item_serials?.serial_no || '-'],
        ['Lokasi/Area', record.item_serials?.location_area || '-'],
        ['Scope of Instruments', record.scope_of_instruments || '-'],
        ['Range', record.range || '-'],
        ['Unit', record.unit || '-'],
        ['Tanggal Kalibrasi', record.calibration_date || '-'],
        ['Due Date', record.due_date || '-'],
        ['Calibration By', record.calibration_by || '-'],
        ['Judgement', record.judgement || '-'],
        ['Remark', record.remark || '-'],
      ],
    });

    const finalY = doc.lastAutoTable.finalY + 25;
    doc.text('Disetujui oleh,', 140, finalY);
    doc.text('_______________________', 140, finalY + 20);
    doc.text('QC', 140, finalY + 25);

    return doc.output('blob');
  }

  async function handleGenerate(record) {
    setProcessingId(record.id);
    try {
      const certNumber = await generateCertificateNumber();
      const pdfBlob = await generateCertificatePDF(record, certNumber);
      const fileName = `${certNumber}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true,
        });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('certificates')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('calibration_records')
        .update({
          approved_by: profile.id,
          certificate_number: certNumber,
          certificate_url: urlData.publicUrl,
        })
        .eq('id', record.id);
      if (updateError) throw updateError;

      loadRecords();
    } catch (err) {
      alert('Gagal generate sertifikat: ' + err.message);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) return <p style={{ padding: 20 }}>Memuat data...</p>;

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Generate Certificate</h2>
      <p style={{ color: '#666', fontSize: 14 }}>
        Data internal yang sudah disetujui QC dan belum punya sertifikat.
      </p>
      {records.length === 0 && <p>Tidak ada sertifikat yang perlu dibuat.</p>}

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
            Serial: {r.item_serials?.serial_no} | Lokasi:{' '}
            {r.item_serials?.location_area}
          </p>
          <p style={{ margin: '4px 0' }}>
            Tanggal Kalibrasi: {r.calibration_date} | Due: {r.due_date}
          </p>
          <p style={{ margin: '4px 0' }}>
            Judgement: <b>{r.judgement}</b>
          </p>
          {canGenerate ? (
            <button
              onClick={() => handleGenerate(r)}
              disabled={processingId === r.id}
              style={{ padding: '8px 16px', marginTop: 8 }}
            >
              {processingId === r.id
                ? '⏳ Membuat sertifikat...'
                : '📄 Generate Certificate'}
            </button>
          ) : (
            <p
              style={{
                color: '#8A8F8D',
                fontSize: 13,
                fontStyle: 'italic',
                marginTop: 8,
              }}
            >
              🔒 Hanya Admin yang dapat generate sertifikat.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

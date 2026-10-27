import { useState, useEffect } from 'react';
import { UploadCloud, X, AlertCircle, CheckCircle2, FileSpreadsheet, Clipboard, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { classesAPI } from '../../services/api';
import styles from './AdminModals.module.css';

// Comprehensive synonym mapping for flexible column detection
const ALIAS_MAP = {
  s_no: ['sno', 'slno', 'sl_no', 's_no', 's.no', 'sl.no', 'serialno', 'serialnumber', 'idx', '#', 'no'],
  roll_no: ['rollno', 'roll_no', 'roll no', 'regno', 'reg_no', 'reg.no', 'reg no', 'register_number', 'registernumber', 'registerno', 'registration_number', 'registrationno', 'enrollmentno', 'studentid', 'student_id', 'usn', 'admno', 'register no'],
  name: ['name', 'studentname', 'student_name', 'student name', 'candidatename', 'candidate name', 'nameofthestudent', 'fullname', 'full name', 'staffname', 'staff name', 'facultyname', 'faculty name', 'teachername', 'subjectname', 'subject name', 'coursename', 'course title', 'classname', 'class name'],
  class_id: ['classid', 'class_id', 'class id', 'class', 'section', 'sec', 'classcode', 'class code'],
  code: ['code', 'subcode', 'sub code', 'subjectcode', 'subject code', 'coursecode', 'course code', 'papercode', 'paper code', 'subject_code'],
  total_hours: ['totalhours', 'total hours', 'total_hours', 'totalhrs', 'total hrs', 'workinghours', 'working hours', 'th', 'hours', 'hrs'],
  ltpc: ['ltpc', 'l-t-p-c', 'l t p c', 'periods'],
  credits: ['credits', 'credit', 'cr'],
  type: ['type', 'subjecttype', 'subject type', 'coursetype', 'course type', 'category'],
  department: ['department', 'dept', 'branch', 'programme', 'discipline'],
  semester: ['semester', 'sem', 'term'],
  year_label: ['year', 'yearlabel', 'year label', 'year_label', 'yr'],
  email: ['email', 'emailid', 'email_id', 'email id', 'mail', 'emailaddress', 'e-mail'],
  designation: ['designation', 'post', 'position', 'title'],
  role: ['role', 'userrole', 'user role', 'access'],
  employee_id: ['employeeid', 'employee_id', 'employee id', 'empid', 'emp_id', 'emp id', 'facultyid', 'staffid', 'employeeno', 'staff no'],
  id: ['id', 'identifier', 'key']
};

function normalizeKey(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchColumn(header, expectedColumns) {
  const normHeader = normalizeKey(header);
  if (!normHeader) return null;

  // 1. Direct match with expected column name
  for (const exp of expectedColumns) {
    if (normalizeKey(exp) === normHeader) return exp;
  }

  // 2. Alias dictionary lookup
  for (const exp of expectedColumns) {
    const aliases = ALIAS_MAP[exp] || [];
    if (aliases.some(alias => normalizeKey(alias) === normHeader)) {
      return exp;
    }
  }

  return null;
}

export default function BulkUploadModal({ title, expectedColumns, onUpload, onClose }) {
  const [activeTab, setActiveTab] = useState('file'); // 'file' | 'paste'
  const [pastedText, setPastedText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [parsedRows, setParsedRows] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState({});
  const [classesList, setClassesList] = useState([]);
  const [defaultClassId, setDefaultClassId] = useState('');

  // Fetch classes if class_id is an expected column
  useEffect(() => {
    if (expectedColumns.includes('class_id')) {
      classesAPI.getAll()
        .then(cls => {
          setClassesList(cls || []);
          if (cls && cls.length > 0) setDefaultClassId(cls[0].id);
        })
        .catch(console.error);
    }
  }, [expectedColumns]);

  // Process raw 2D array or object array into standardized MarkHub format
  const processRawData = (rows2D) => {
    if (!rows2D || rows2D.length < 2) {
      throw new Error('No tabular data detected. Please ensure your file has at least a header row and 1 row of data.');
    }

    const headerRow = rows2D[0].map(h => String(h || '').trim());
    const columnMap = {}; // originalHeaderIndex -> targetColumn
    const detected = {};

    headerRow.forEach((h, idx) => {
      const match = matchColumn(h, expectedColumns);
      if (match) {
        columnMap[idx] = match;
        detected[h] = match;
      }
    });

    const mappedTargets = Object.values(columnMap);
    if (mappedTargets.length === 0) {
      throw new Error(
        `Could not match any columns. Your file headers are: "${headerRow.join(', ')}". Expected one of: ${expectedColumns.join(', ')}`
      );
    }

    const standardized = [];
    for (let r = 1; r < rows2D.length; r++) {
      const row = rows2D[r];
      // Skip completely empty rows
      if (!row || row.every(val => val === null || val === undefined || String(val).trim() === '')) {
        continue;
      }

      const item = {};
      Object.keys(columnMap).forEach(colIdx => {
        const targetKey = columnMap[colIdx];
        const val = row[colIdx];
        item[targetKey] = val !== undefined && val !== null ? String(val).trim() : '';
      });

      // Smart Defaults & ID synthesis
      if (expectedColumns.includes('s_no') && !item.s_no) {
        item.s_no = r;
      }

      if (expectedColumns.includes('id') && !item.id) {
        if (item.roll_no) item.id = `ST_${item.roll_no}`;
        else if (item.code) item.id = `SUB_${item.code}_${item.class_id || ''}`;
        else if (item.employee_id) item.id = `STF_${item.employee_id}`;
        else item.id = `ID_${Date.now()}_${r}`;
      }

      // If class_id is missing and default is selected
      if (expectedColumns.includes('class_id') && !item.class_id && defaultClassId) {
        item.class_id = defaultClassId;
      }

      standardized.push(item);
    }

    if (standardized.length === 0) {
      throw new Error('No valid data rows found in the uploaded file.');
    }

    setDetectedColumns(detected);
    setParsedRows(standardized);
  };

  // 1. File Upload (Excel .xlsx/.xls, CSV, TSV)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');
    setParsedRows([]);

    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      // Excel File Handling via XLSX
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const buffer = evt.target.result;
          const wb = XLSX.read(buffer, { type: 'array' });
          const firstSheetName = wb.SheetNames[0];
          const sheet = wb.Sheets[firstSheetName];
          const rows2D = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          processRawData(rows2D);
        } catch (err) {
          setError('Failed to parse Excel file: ' + err.message);
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read Excel file.');
        setLoading(false);
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV / TSV / Text Handling via PapaParse
      Papa.parse(file, {
        skipEmptyLines: true,
        header: false,
        complete: (results) => {
          try {
            processRawData(results.data);
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        error: (err) => {
          setError('CSV parse error: ' + err.message);
          setLoading(false);
        }
      });
    }
  };

  // 2. Paste Text / Table (from PDF, Word, or Webpage)
  const handleParsePastedText = () => {
    if (!pastedText.trim()) {
      setError('Please paste text or table content first.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const results = Papa.parse(pastedText.trim(), {
        skipEmptyLines: true,
        header: false
      });
      processRawData(results.data);
    } catch (err) {
      setError('Failed to parse pasted text: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Confirm & Submit Data
  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;

    // Apply default class if needed
    const finalRows = parsedRows.map(row => {
      if (expectedColumns.includes('class_id') && (!row.class_id || row.class_id.trim() === '')) {
        return { ...row, class_id: defaultClassId };
      }
      return row;
    });

    setLoading(true);
    setError('');
    try {
      await onUpload(finalRows);
      onClose();
    } catch (err) {
      setError(err.message || 'Import failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent} style={{ maxWidth: '780px', width: '95%' }}>
        <div className={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileSpreadsheet size={20} color="var(--primary, #2563eb)" />
            <h3>{title}</h3>
          </div>
          <button onClick={onClose} className={styles.closeBtn}><X size={18} /></button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Format Selection Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', borderBottom: '1px solid var(--border-solid, #e2e8f0)', paddingBottom: '10px' }}>
            <button
              type="button"
              onClick={() => { setActiveTab('file'); setParsedRows([]); setError(''); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: activeTab === 'file' ? 'var(--primary, #2563eb)' : '#f1f5f9',
                color: activeTab === 'file' ? '#fff' : '#475569'
              }}
            >
              <UploadCloud size={16} /> Upload Excel / CSV / File
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('paste'); setParsedRows([]); setError(''); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px', borderRadius: '6px', fontSize: '0.84rem', fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: activeTab === 'paste' ? 'var(--primary, #2563eb)' : '#f1f5f9',
                color: activeTab === 'paste' ? '#fff' : '#475569'
              }}
            >
              <Clipboard size={16} /> Paste from PDF / Table / Word
            </button>
          </div>

          {/* Smart Helper Information */}
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.82rem', color: '#475569' }}>
            <strong>✨ Smart Format Auto-Adoption:</strong> Accepts any format! Headers like <em>Roll No, Reg No, Register Number, Student Name, S.No, Course Code</em> are automatically detected and mapped to MarkHub format.
          </div>

          {/* Fallback Class Dropdown if class_id is expected */}
          {expectedColumns.includes('class_id') && classesList.length > 0 && (
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px', background: '#eff6ff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e40af' }}>
                Default Class (applied if missing in file):
              </span>
              <select
                value={defaultClassId}
                onChange={e => setDefaultClassId(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1.5px solid #93c5fd', fontSize: '0.82rem', fontWeight: 600, color: '#1e3a8a', background: '#fff' }}
              >
                {classesList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: File Upload */}
          {activeTab === 'file' && parsedRows.length === 0 && (
            <div className={styles.uploadArea}>
              <UploadCloud size={44} className={styles.uploadIcon} />
              <p style={{ fontSize: '0.92rem', marginBottom: '4px', fontWeight: 600 }}>Click to select an Excel (.xlsx, .xls) or CSV file</p>
              <span style={{ fontSize: '0.78rem', color: '#64748b' }}>Supports files from Anna University, Excel sheets, and college marks sheets</span>
              <input 
                type="file" 
                accept=".csv, .xlsx, .xls, .tsv, .txt" 
                onChange={handleFileUpload} 
                disabled={loading}
                className={styles.fileInput}
              />
              {loading && <p className={styles.loadingText}><RefreshCw size={14} className={styles.spinner} /> Reading & Analyzing columns...</p>}
            </div>
          )}

          {/* TAB 2: Text / Table Paste */}
          {activeTab === 'paste' && parsedRows.length === 0 && (
            <div>
              <textarea
                rows={6}
                value={pastedText}
                onChange={e => setPastedText(e.target.value)}
                placeholder="Paste table text copied from PDF, Excel, or Word here...&#10;Example:&#10;S.No&#9;Reg No&#9;Student Name&#10;1&#9;921025205001&#9;Abarna M&#10;2&#9;921025205002&#9;Abirami R"
                style={{
                  width: '100%', padding: '10px', borderRadius: '8px', border: '1.5px solid #cbd5e1',
                  fontFamily: 'monospace', fontSize: '0.82rem', resize: 'vertical', background: '#f8fafc'
                }}
              />
              <button
                type="button"
                onClick={handleParsePastedText}
                disabled={loading || !pastedText.trim()}
                style={{
                  marginTop: '10px', padding: '8px 16px', borderRadius: '6px', background: 'var(--primary, #2563eb)',
                  color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                }}
              >
                Analyze & Preview Pasted Data
              </button>
            </div>
          )}

          {/* PREVIEW SECTION ONCE PARSED */}
          {parsedRows.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <span style={{ fontWeight: 700, fontSize: '0.92rem', color: '#166534' }}>
                    Successfully mapped {parsedRows.length} records!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setParsedRows([]); setDetectedColumns({}); }}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Choose another file
                </button>
              </div>

              {/* Column Mapping Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                {Object.keys(detectedColumns).map(orig => (
                  <span key={orig} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', borderRadius: '12px', fontSize: '0.72rem',
                    background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1'
                  }}>
                    <strong>{orig}</strong> <ArrowRight size={10} /> <strong>{detectedColumns[orig]}</strong>
                  </span>
                ))}
              </div>

              {/* Data Preview Table (First 5 rows) */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                  <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, borderBottom: '1px solid #e2e8f0' }}>
                    <tr>
                      {Object.keys(parsedRows[0] || {}).map(k => (
                        <th key={k} style={{ padding: '6px 10px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 5).map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        {Object.values(row).map((val, cIdx) => (
                          <td key={cIdx} style={{ padding: '6px 10px', color: '#1e293b' }}>
                            {String(val || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 5 && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', textAlign: 'right' }}>
                  Showing first 5 of {parsedRows.length} records.
                </div>
              )}

              {/* Confirmation CTA */}
              <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1',
                    background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmImport}
                  disabled={loading}
                  style={{
                    padding: '8px 20px', borderRadius: '6px', border: 'none',
                    background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {loading ? <RefreshCw size={14} className={styles.spinner} /> : <CheckCircle2 size={16} />}
                  Confirm & Import ({parsedRows.length} records)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

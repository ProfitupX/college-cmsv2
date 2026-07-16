import { useState } from 'react';
import { UploadCloud, X, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import styles from './AdminModals.module.css';

export default function BulkUploadModal({ title, expectedColumns, onUpload, onClose }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError('');

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          // Basic validation to check if the file has at least some of the expected columns
          const fields = results.meta.fields || [];
          const missingCols = expectedColumns.filter(c => !fields.includes(c));
          
          if (missingCols.length === expectedColumns.length) {
            throw new Error(`Invalid CSV format. Please ensure your headers match exactly: ${expectedColumns.join(', ')}`);
          }

          if (results.data.length === 0) {
            throw new Error('CSV file is empty.');
          }

          await onUpload(results.data);
          onClose();
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        setError('Error parsing CSV file: ' + err.message);
        setLoading(false);
      }
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button onClick={onClose} className={styles.closeBtn}><X size={18} /></button>
        </div>
        
        <div className={styles.modalBody}>
          <p className={styles.helperText}>
            Upload a CSV file (exported from Excel). Ensure your header row exactly matches these column names:
            <br />
            <strong>{expectedColumns.join(', ')}</strong>
          </p>

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className={styles.uploadArea}>
            <UploadCloud size={40} className={styles.uploadIcon} />
            <p>Click to select a CSV file</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileUpload} 
              disabled={loading}
              className={styles.fileInput}
            />
            {loading && <p className={styles.loadingText}>Processing...</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

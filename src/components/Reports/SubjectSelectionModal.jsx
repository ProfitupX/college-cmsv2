import { useState, useEffect } from 'react';
import { X, CheckSquare, Square, FileText, Download } from 'lucide-react';
import styles from './SubjectSelectionModal.module.css';

export default function SubjectSelectionModal({ isOpen, onClose, onSubmit, subjects = [] }) {
  const [selectedIds, setSelectedIds] = useState([]);

  // Initialize all subjects as selected by default when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(subjects.map(s => s.id));
    }
  }, [isOpen, subjects]);

  if (!isOpen) return null;

  const isAllSelected = selectedIds.length === subjects.length && subjects.length > 0;
  
  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedIds([]); // Deselect all
    } else {
      setSelectedIds(subjects.map(s => s.id)); // Select all
    }
  };

  const handleToggleSubject = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(sid => sid !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      alert("Please select at least one subject to generate the PDF.");
      return;
    }
    onSubmit(selectedIds);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <FileText size={20} color="var(--primary)" />
            Select Subjects for PDF
          </h2>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.body}>
          <p className={styles.description}>
            Choose which subjects you want to include in this report.
          </p>

          <div className={styles.selectAllBtn} onClick={handleToggleAll}>
            {isAllSelected ? <CheckSquare size={18} color="var(--primary)" /> : <Square size={18} color="var(--text-muted)" />}
            <span className={styles.selectAllText}>Select All Subjects</span>
          </div>

          <div className={styles.subjectList}>
            {subjects.map(sub => (
              <div 
                key={sub.id}
                onClick={() => handleToggleSubject(sub.id)}
                className={`${styles.subjectItem} ${selectedIds.includes(sub.id) ? styles.selected : ''}`}
              >
                {selectedIds.includes(sub.id) ? <CheckSquare size={16} color="var(--primary)" /> : <Square size={16} color="var(--text-muted)" />}
                <div className={styles.subjectInfo}>
                  <span className={styles.subjectName}>{sub.name}</span>
                  <span className={styles.subjectCode}>{sub.code}</span>
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <div className={styles.emptyState}>
                No subjects available for this class.
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.submitBtn} disabled={selectedIds.length === 0}>
              <Download size={16} />
              Generate PDF
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import styles from './DeclarationModal.module.css';

const DeclarationModal = ({ isOpen, onClose, onSubmit, session }) => {
  const [formData, setFormData] = useState({
    conductedAsPerPlan: 'Yes',
    classesPlanned: '20',
    classesTaken: '23',
    resultOpinion: 'Moderate / Good',
    lessThan75: 'No',
    reasonForFailures: '-',
    lessThanPrevTest: 'No',
    reasonForPrevTest: '-',
    remedialActions: session?.remedial_action || 'Regular Writing practice with the previous year Anna University Questions.',
    principalSuggestions: '-'
  });

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        
        {/* Header */}
        <div className={styles.modalHeader}>
          <div>
            <h3>Declaration by Staff</h3>
            <p>Please fill out this section for the Subject Analysis Report.</p>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <div className={styles.modalBody}>
          <form id="declarationForm" onSubmit={handleSubmit}>
            
            <div className={styles.formSection}>
              <h4 className={styles.sectionTitle}>I Certify that:</h4>
              
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>a) Classes conducted as per course plan?</label>
                  <select name="conductedAsPerPlan" value={formData.conductedAsPerPlan} onChange={handleChange}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>c) Result opinion:</label>
                  <input type="text" name="resultOpinion" value={formData.resultOpinion} onChange={handleChange} />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>b) Number of classes Planned:</label>
                  <input type="number" name="classesPlanned" value={formData.classesPlanned} onChange={handleChange} />
                </div>
                <div className={styles.formGroup}>
                  <label>Actually Taken:</label>
                  <input type="number" name="classesTaken" value={formData.classesTaken} onChange={handleChange} />
                </div>
              </div>
            </div>

            <hr className={styles.divider} />

            <div className={styles.formSection}>
              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>3. Is the pass percentage less than 75%?</label>
                  <select name="lessThan75" value={formData.lessThan75} onChange={handleChange}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>4. Reason for more failures:</label>
                  <input 
                    type="text" 
                    name="reasonForFailures" 
                    value={formData.reasonForFailures} 
                    onChange={handleChange}
                    disabled={formData.lessThan75 === 'No'}
                  />
                </div>
              </div>

              <div className={styles.grid2}>
                <div className={styles.formGroup}>
                  <label>5. Pass percentage &lt; previous test?</label>
                  <select name="lessThanPrevTest" value={formData.lessThanPrevTest} onChange={handleChange}>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>6. Reason:</label>
                  <input 
                    type="text" 
                    name="reasonForPrevTest" 
                    value={formData.reasonForPrevTest} 
                    onChange={handleChange}
                    disabled={formData.lessThanPrevTest === 'No'}
                  />
                </div>
              </div>
              
              <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                <label>7. Plan of Remedial actions to improve pass percentage:</label>
                <input 
                  type="text" 
                  name="remedialActions" 
                  value={formData.remedialActions} 
                  onChange={handleChange}
                />
              </div>
              
              <div className={styles.formGroup} style={{ marginTop: '16px' }}>
                <label>8. Principal's suggestions to improve pass percentage:</label>
                <input 
                  type="text" 
                  name="principalSuggestions" 
                  value={formData.principalSuggestions} 
                  onChange={handleChange}
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <button type="button" onClick={onClose} className={styles.cancelBtn}>
            Cancel
          </button>
          <button 
            type="submit" 
            form="declarationForm"
            className={styles.submitBtn}
          >
            <FileText size={16} /> Generate Report
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeclarationModal;

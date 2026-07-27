import { useState } from 'react';
import { Plus, Trash2, ChevronDown, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ASSESSMENT_TYPES, MAX_STAFF_ALLOCATION } from '../../data/assessmentTypes';
import styles from './ComponentBuilder.module.css';

// Counter to create unique ids per added component
let uid = 1;

function TypeBadge({ typeId, small }) {
  const type = ASSESSMENT_TYPES.find((t) => t.id === typeId);
  if (!type) return null;
  return (
    <span
      className={`${styles.typeBadge} ${small ? styles.typeBadgeSmall : ''}`}
      style={{ background: `${type.color}18`, color: type.color, border: `1px solid ${type.color}30` }}
    >
      {type.icon} {type.label}
    </span>
  );
}

export default function ComponentBuilder({ components, onChange, isLocked }) {
  const [selectedType, setSelectedType] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const totalMax = components.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);

  const selectedTypeMeta = ASSESSMENT_TYPES.find((t) => t.id === selectedType);

  const handleTypeChange = (val) => {
    setSelectedType(val);
    const meta = ASSESSMENT_TYPES.find((t) => t.id === val);
    if (meta) {
      setCustomLabel(meta.label);
      setMaxMarks(String(meta.suggestedMax));
    }
  };

  const handleAdd = () => {
    if (!selectedType || !maxMarks || parseFloat(maxMarks) <= 0) return;
    const weight = parseFloat(maxMarks);
    if (totalMax + weight > MAX_STAFF_ALLOCATION) {
      setErrorMsg(`Cannot add component. Total weight would exceed ${MAX_STAFF_ALLOCATION}%. (You currently have ${totalMax}% allocated)`);
      return;
    }
    
    const newComp = {
      uid: uid++,
      typeId: selectedType,
      label: customLabel.trim() || selectedTypeMeta?.label || selectedType,
      conductedMax: weight,
      max: weight,
      color: selectedTypeMeta?.color || '#6C63FF',
      icon: selectedTypeMeta?.icon || '📝',
    };
    onChange([...components, newComp]);
    // Reset
    setSelectedType('');
    setCustomLabel('');
    setMaxMarks('');
    setErrorMsg('');
  };

  const handleRemove = (uid) => {
    onChange(components.filter((c) => c.uid !== uid));
  };

  const handleMaxChange = (uid, val) => {
    const floatVal = parseFloat(val) || 0;
    onChange(components.map((c) => (c.uid === uid ? { ...c, max: floatVal, conductedMax: floatVal } : c)));
  };

  const handleLabelChange = (uid, val) => {
    onChange(components.map((c) => (c.uid === uid ? { ...c, label: val } : c)));
  };

  if (isLocked) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Assessment Composition</h3>
            <p className={styles.sub}>Total Weight: <strong>{totalMax}%</strong></p>
          </div>
        </div>
        <div className={styles.compList}>
          {components.map((comp) => (
            <div key={comp.uid} className={styles.compItem}>
              <div className={styles.compMeta}>
                <TypeBadge typeId={comp.typeId} />
                <span className={styles.compLabelText}>{comp.label}</span>
              </div>
              <div className={styles.compInputs}>
                <div className={styles.compField}>
                  <span className={styles.fieldLabel}>Weight</span>
                  <span>{comp.max}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Build Assessment Sheet</h3>
          <p className={styles.sub}>
            Add the marks components for this subject. Total weight allowed is <strong>{MAX_STAFF_ALLOCATION}%</strong> (5% reserved for Attendance).
          </p>
        </div>
        {/* Total indicator */}
        <div className={styles.totalIndicator}>
          <div className={styles.totalLabel}>Total Weight %</div>
          <div className={`${styles.totalVal} ${totalMax === 0 ? styles.totalZero : ''} ${totalMax > MAX_STAFF_ALLOCATION ? styles.totalError : ''}`}>
            {totalMax}% / {MAX_STAFF_ALLOCATION}%
          </div>
          <div className={styles.totalSub}>5% reserved for Attendance</div>
        </div>
      </div>
      
      {errorMsg && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {/* Add Component Row */}
      <div className={styles.addRow}>
        {/* Type dropdown */}
        <div className={styles.field}>
          <label className={styles.label}>Assessment Type</label>
          <div className={styles.selectWrap}>
            <select
              id="assessment-type-select"
              className={styles.select}
              value={selectedType}
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <option value="">— Choose type —</option>
              {ASSESSMENT_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon}  {t.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.chevron} />
          </div>
        </div>

        {/* Custom label */}
        <div className={styles.field}>
          <label className={styles.label}>Custom Name</label>
          <input
            id="component-label-input"
            type="text"
            className={styles.input}
            placeholder="e.g. Test 1, Quiz 2…"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
          />
        </div>

        {/* Max Marks */}
        <div className={`${styles.field} ${styles.fieldSmall}`}>
          <label className={styles.label}>Max Marks</label>
          <input
            id="component-max-input"
            type="number"
            min="1"
            max="95"
            className={styles.input}
            placeholder="50"
            value={maxMarks}
            onChange={(e) => {
              setMaxMarks(e.target.value);
              setErrorMsg('');
            }}
            title="Maximum marks for this component"
          />
        </div>

        {/* Add Button */}
        <button
          id="add-component-btn"
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={!selectedType || !maxMarks || parseFloat(maxMarks) <= 0}
          title="Add component"
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      {/* Quick-pick chips */}
      <div className={styles.quickPick}>
        <span className={styles.quickLabel}>Quick add:</span>
        {ASSESSMENT_TYPES.slice(0, 6).map((t) => (
          <button
            key={t.id}
            className={styles.quickChip}
            style={{ '--qc': t.color }}
            onClick={() => handleTypeChange(t.id)}
            title={`Add ${t.label}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Components List */}
      {components.length > 0 && (
        <div className={styles.componentsList}>
          <div className={styles.compListHeader}>
            <span>Name</span>
            <span>Type</span>
            <span className={styles.centerCol}>Max Marks</span>
            <span />
          </div>
          {components.map((comp) => {
            return (
              <div key={comp.uid} className={styles.compItem}>
                {/* Label */}
                <input
                  type="text"
                  className={styles.compLabelInput}
                  value={comp.label}
                  onChange={(e) => handleLabelChange(comp.uid, e.target.value)}
                />
                {/* Type badge */}
                <TypeBadge typeId={comp.typeId} small />
                {/* Max Marks */}
                <div className={styles.centerCol}>
                  <input
                    type="number"
                    min="1"
                    className={styles.maxInput}
                    value={comp.max}
                    onChange={(e) => handleMaxChange(comp.uid, e.target.value)}
                    title="Max Marks"
                  />
                </div>
                {/* Remove */}
                <button
                  className={styles.removeBtn}
                  onClick={() => handleRemove(comp.uid)}
                  title="Remove component"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}

          {/* Summary bar */}
          <div className={styles.summary}>
            <div className={styles.summaryLeft}>
              <CheckCircle2 size={15} color="var(--success)" />
              <span>{components.length} component{components.length !== 1 ? 's' : ''}</span>
              <span className={styles.summarySep}>·</span>
              <span>Total Allocated Weight: <strong className={totalMax > MAX_STAFF_ALLOCATION ? styles.textError : ''}>{totalMax}%</strong></span>
              <span className={styles.summarySep}>·</span>
              <span className={styles.normalizeNote}>
                Remaining {MAX_STAFF_ALLOCATION - totalMax}% available.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {components.length === 0 && (
        <div className={styles.empty}>
          <AlertCircle size={32} color="var(--text-muted)" />
          <p>No assessment components added yet.</p>
          <p className={styles.emptySub}>Select a type and click <strong>Add</strong> to build your marks sheet.</p>
        </div>
      )}
    </div>
  );
}

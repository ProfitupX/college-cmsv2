import { useState } from 'react';
import { Plus, Trash2, ChevronDown, AlertCircle, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { ASSESSMENT_TYPES, MAX_STAFF_ALLOCATION } from '../../data/assessmentTypes';
import { getPGComponentPresets } from '../../utils/pgRegulation2025';
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

export default function ComponentBuilder({
  components = [],
  onChange,
  isLocked,
  maxAllocation = MAX_STAFF_ALLOCATION,
  isPG = false,
  subjectType = 'Theory',
  selectedComponentId = null,
  onSelectComponent
}) {
  const [selectedType, setSelectedType] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Standardized to 95 Marks for all 2025 assessment modules (5 Marks reserved for Attendance)
  const effectiveMaxAllocation = MAX_STAFF_ALLOCATION;
  const totalMax = (components || []).reduce((s, c) => s + (parseFloat(c?.max) || 0), 0);
  const remainingMarks = Math.max(0, effectiveMaxAllocation - totalMax);

  // Standard Official R2025 Assessment Presets (summing to 95 Marks)
  const getStandardR2025Preset = () => {
    const sType = String(subjectType || '').toLowerCase();
    if (sType.includes('practical') || sType.includes('lab') && !sType.includes('cum')) {
      return [
        { uid: Date.now() + 1, typeId: 'practical', label: 'Lab Experiments & Observation', conductedMax: 35, max: 35, color: '#F472B6', icon: '🔬' },
        { uid: Date.now() + 2, typeId: 'model', label: 'Model Practical Examination', conductedMax: 30, max: 30, color: '#8B5CF6', icon: '🏆' },
        { uid: Date.now() + 3, typeId: 'viva', label: 'Viva / Oral Examination', conductedMax: 15, max: 15, color: '#FB923C', icon: '🎤' },
        { uid: Date.now() + 4, typeId: 'lab_record', label: 'Lab Record / Journal', conductedMax: 15, max: 15, color: '#10B981', icon: '📓' }
      ];
    } else if (sType.includes('cum') || (sType.includes('theory') && sType.includes('lab'))) {
      return [
        { uid: Date.now() + 1, typeId: 'test', label: 'Theory Continuous Assessment', conductedMax: 25, max: 25, color: '#6C63FF', icon: '📝' },
        { uid: Date.now() + 2, typeId: 'practical', label: 'Laboratory Assessment', conductedMax: 25, max: 25, color: '#F472B6', icon: '🔬' },
        { uid: Date.now() + 3, typeId: 'assignment', label: 'Course Assignment / Activities', conductedMax: 25, max: 25, color: '#22D3EE', icon: '📋' },
        { uid: Date.now() + 4, typeId: 'quiz', label: 'Quiz / Viva', conductedMax: 20, max: 20, color: '#10B981', icon: '❓' }
      ];
    } else {
      // Theory Standard Preset
      return [
        { uid: Date.now() + 1, typeId: 'test', label: 'Internal Test 1', conductedMax: 25, max: 25, color: '#6C63FF', icon: '📝' },
        { uid: Date.now() + 2, typeId: 'test', label: 'Internal Test 2', conductedMax: 25, max: 25, color: '#3B82F6', icon: '📝' },
        { uid: Date.now() + 3, typeId: 'assignment', label: 'Assignment / Activities', conductedMax: 25, max: 25, color: '#22D3EE', icon: '📋' },
        { uid: Date.now() + 4, typeId: 'quiz', label: 'Quiz / Seminar', conductedMax: 20, max: 20, color: '#10B981', icon: '❓' }
      ];
    }
  };

  const handleLoadOfficialPreset = () => {
    const presetComps = getStandardR2025Preset();
    onChange(presetComps);
    setErrorMsg('');
    if (onSelectComponent && presetComps.length > 0) {
      onSelectComponent(presetComps[0].uid);
    }
  };

  const selectedTypeMeta = ASSESSMENT_TYPES.find((t) => t.id === selectedType);

  const handleTypeChange = (val) => {
    setSelectedType(val);
    const meta = ASSESSMENT_TYPES.find((t) => t.id === val);
    if (meta) {
      setCustomLabel(meta.label);
      const suggested = meta.suggestedMax || 25;
      setMaxMarks(String(remainingMarks > 0 ? Math.min(suggested, remainingMarks) : suggested));
    }
  };

  const handleAdd = () => {
    if (!selectedType || !maxMarks || parseFloat(maxMarks) <= 0) return;
    const weight = parseFloat(maxMarks);
    if (totalMax + weight > effectiveMaxAllocation) {
      setErrorMsg(`Cannot add component. Total weight would exceed ${effectiveMaxAllocation} Marks. (You currently have ${totalMax} Marks allocated, remaining: ${remainingMarks} Marks)`);
      return;
    }

    const newComp = {
      uid: Date.now() + Math.floor(Math.random() * 1000),
      typeId: selectedType,
      label: customLabel.trim() || selectedTypeMeta?.label || selectedType,
      conductedMax: weight,
      max: weight,
      color: selectedTypeMeta?.color || '#6C63FF',
      icon: selectedTypeMeta?.icon || '📝',
    };
    const updated = [...components, newComp];
    onChange(updated);
    if (onSelectComponent) {
      onSelectComponent(newComp.uid);
    }
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
            <p className={styles.sub}>Total Weight: <strong>{totalMax} Marks</strong> (out of 95)</p>
          </div>
        </div>
        <div className={styles.compList}>
          {(components || []).filter(Boolean).map((comp) => (
            <div key={comp.uid} className={styles.compItem}>
              <div className={styles.compMeta}>
                <TypeBadge typeId={comp.typeId} />
                <span className={styles.compLabelText}>{comp.label}</span>
              </div>
              <div className={styles.compInputs}>
                <div className={styles.compField}>
                  <span className={styles.fieldLabel}>Weight</span>
                  <span>{comp.max} Marks</span>
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
          <h3 className={styles.title}>
            Build Assessment Sheet {isPG ? `(PG R2025 - ${subjectType})` : `(R2025 - ${subjectType})`}
          </h3>
          <p className={styles.sub}>
            Add assessment components for this subject. Maximum allocation is <strong>95 Marks</strong> (remaining <strong>5 Marks</strong> reserved for Attendance; Overall Total: <strong>100 Marks</strong>).
          </p>
        </div>
        {/* Total indicator */}
        <div className={styles.totalIndicator}>
          <div className={styles.totalLabel}>Total Allocated</div>
          <div className={`${styles.totalVal} ${totalMax === 0 ? styles.totalZero : ''} ${totalMax > effectiveMaxAllocation ? styles.totalError : ''}`}>
            {totalMax} / {effectiveMaxAllocation}
          </div>
          <div className={styles.totalSub}>
            5 Marks reserved for Attendance
          </div>
        </div>
      </div>

      {/* Standard Official R2025 Assessment Preset Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
        border: '1.5px solid rgba(99, 102, 241, 0.3)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>📜</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#4338ca' }}>
              Standard Regulation 2025 Assessment Scheme ({subjectType})
            </div>
            <div style={{ fontSize: '0.78rem', color: '#6366f1' }}>
              Component Allocation: <strong>95 Marks</strong> · Attendance: <strong>5 Marks</strong> · Overall Total: <strong>100 Marks</strong>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLoadOfficialPreset}
          style={{
            background: '#4f46e5',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 14px',
            fontSize: '0.8rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title={`Load official 2025 preset (95 Marks) for ${subjectType}`}
        >
          <Sparkles size={14} /> Load Official R2025 Preset (95 Marks)
        </button>
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
            max={String(effectiveMaxAllocation)}
            className={styles.input}
            placeholder={String(remainingMarks > 0 ? remainingMarks : 25)}
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
            <span className={styles.centerCol}>Mark Entry</span>
            <span />
          </div>
          {(components || []).filter(Boolean).map((comp) => {
            const isSelected = selectedComponentId === comp.uid;
            return (
              <div
                key={comp.uid}
                className={`${styles.compItem} ${isSelected ? styles.compItemSelected : ''}`}
                style={{
                  border: isSelected ? '1.5px solid #6366f1' : undefined,
                  background: isSelected ? 'rgba(99, 102, 241, 0.04)' : undefined,
                  cursor: onSelectComponent ? 'pointer' : undefined
                }}
                onClick={() => onSelectComponent && onSelectComponent(comp.uid)}
                title="Click to select this component for mark entry"
              >
                {/* Label */}
                <input
                  type="text"
                  className={styles.compLabelInput}
                  value={comp.label}
                  onChange={(e) => handleLabelChange(comp.uid, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
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
                    onClick={(e) => e.stopPropagation()}
                    title="Max Marks"
                  />
                </div>
                {/* Select / Active Indicator */}
                <div className={styles.centerCol}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSelectComponent) onSelectComponent(comp.uid);
                    }}
                    style={{
                      background: isSelected ? '#4f46e5' : '#f1f5f9',
                      color: isSelected ? '#ffffff' : '#475569',
                      border: isSelected ? '1px solid #4338ca' : '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Select this component for student-wise mark entry"
                  >
                    {isSelected ? '✓ Selected' : 'Select'}
                  </button>
                </div>
                {/* Remove */}
                <button
                  className={styles.removeBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(comp.uid);
                  }}
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
              <span>Total Allocated Weight: <strong className={totalMax > effectiveMaxAllocation ? styles.textError : ''}>{totalMax} Marks</strong></span>
              <span className={styles.summarySep}>·</span>
              <span className={styles.normalizeNote}>
                Remaining {remainingMarks} Marks available (5 Marks for Attendance).
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
          <p className={styles.emptySub}>
            Click "Load Official R2025 Preset" above or choose a type and click Add to build your marks sheet.
          </p>
        </div>
      )}
    </div>
  );
}

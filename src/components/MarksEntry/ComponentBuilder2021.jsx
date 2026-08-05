import { useState } from 'react';
import { Plus, Trash2, ChevronDown, AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ASSESSMENT_TYPES } from '../../data/assessmentTypes';
import styles from './ComponentBuilder.module.css';

/**
 * ComponentBuilder for 2021 Regulation
 * 
 * Max total CIA = 40 marks (Theory) or 50 marks (Lab-cum-Theory)
 * No attendance component — purely marks-based.
 */

let uid2021 = 1000;

function TypeBadge({ typeId, small }) {
  const type = ASSESSMENT_TYPES.find(t => t.id === typeId);
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

export default function ComponentBuilder2021({ components, onChange, isLocked, ciaMax = 40 }) {
  const [selectedType, setSelectedType] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const totalMax = components.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);
  const remaining = ciaMax - totalMax;
  const isOver = totalMax > ciaMax;
  const isFull = totalMax >= ciaMax;

  const selectedTypeMeta = ASSESSMENT_TYPES.find(t => t.id === selectedType);

  const handleTypeChange = (val) => {
    setSelectedType(val);
    const meta = ASSESSMENT_TYPES.find(t => t.id === val);
    if (meta) {
      setCustomLabel(meta.label);
      // Suggest remaining marks if smaller than suggested
      setMaxMarks(String(Math.min(meta.suggestedMax, remaining > 0 ? remaining : meta.suggestedMax)));
    }
  };

  const handleAdd = () => {
    if (!selectedType || !maxMarks || parseFloat(maxMarks) <= 0) return;
    const weight = parseFloat(maxMarks);

    if (totalMax + weight > ciaMax) {
      setErrorMsg(
        `⚠️ Cannot add: total CIA would be ${totalMax + weight} marks, which exceeds the ${ciaMax}-mark limit. ` +
        `You have ${remaining} mark${remaining !== 1 ? 's' : ''} remaining.`
      );
      return;
    }

    const newComp = {
      uid: uid2021++,
      typeId: selectedType,
      label: customLabel.trim() || selectedTypeMeta?.label || selectedType,
      conductedMax: weight,
      max: weight,
      color: selectedTypeMeta?.color || '#7c3aed',
      icon: selectedTypeMeta?.icon || '📝',
    };
    onChange([...components, newComp]);
    setSelectedType('');
    setCustomLabel('');
    setMaxMarks('');
    setErrorMsg('');
  };

  const handleRemove = (uid) => {
    onChange(components.filter(c => c.uid !== uid));
    setErrorMsg('');
  };

  const handleMaxChange = (uid, val) => {
    const floatVal = parseFloat(val) || 0;
    onChange(components.map(c => c.uid === uid ? { ...c, max: floatVal, conductedMax: floatVal } : c));
  };

  const handleLabelChange = (uid, val) => {
    onChange(components.map(c => c.uid === uid ? { ...c, label: val } : c));
  };

  if (isLocked) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.header}>
          <div>
            <h3 className={styles.title}>Assessment Composition (2021 Regulation)</h3>
            <p className={styles.sub}>CIA Total: <strong>{totalMax} / {ciaMax}</strong> marks</p>
          </div>
        </div>
        <div className={styles.compList}>
          {components.map(comp => (
            <div key={comp.uid} className={styles.compItem}>
              <div className={styles.compMeta}>
                <TypeBadge typeId={comp.typeId} />
                <span className={styles.compLabelText}>{comp.label}</span>
              </div>
              <div className={styles.compInputs}>
                <div className={styles.compField}>
                  <span className={styles.fieldLabel}>Max Marks</span>
                  <span>{comp.max}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper} style={{ borderTop: '3px solid #7c3aed' }}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>
            Build CIA Sheet
            <span style={{
              marginLeft: '10px', fontSize: '0.72rem', fontWeight: 600,
              background: '#7c3aed18', color: '#7c3aed', border: '1px solid #7c3aed30',
              borderRadius: '6px', padding: '2px 8px'
            }}>2021 Regulation</span>
          </h3>
          <p className={styles.sub}>
            Add CIA components. Total must not exceed <strong>{ciaMax} marks</strong>.
            No attendance — pure marks only.
          </p>
        </div>

        {/* CIA Meter */}
        <div className={styles.totalIndicator}>
          <div className={styles.totalLabel}>CIA Total</div>
          <div className={`${styles.totalVal} ${isOver ? styles.totalError : totalMax === 0 ? styles.totalZero : ''}`}
            style={{ color: isOver ? '#ef4444' : totalMax === ciaMax ? '#10b981' : undefined }}
          >
            {totalMax} / {ciaMax}
          </div>
          <div className={styles.totalSub} style={{ color: isOver ? '#ef4444' : undefined }}>
            {isOver
              ? `⚠️ Over by ${totalMax - ciaMax} marks!`
              : isFull
                ? '✅ Exactly filled'
                : `${remaining} marks remaining`}
          </div>
        </div>
      </div>

      {/* Over-limit warning banner */}
      {isOver && (
        <div className={styles.errorBanner} style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }}>
          <AlertTriangle size={16} />
          CIA total is <strong>{totalMax}</strong> — exceeds the {ciaMax}-mark limit by <strong>{totalMax - ciaMax} marks</strong>.
          Please reduce some component marks before saving.
        </div>
      )}

      {errorMsg && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={16} /> {errorMsg}
        </div>
      )}

      {/* Add Component Row */}
      <div className={styles.addRow}>
        <div className={styles.field}>
          <label className={styles.label}>Assessment Type</label>
          <div className={styles.selectWrap}>
            <select
              id="assessment-type-2021-select"
              className={styles.select}
              value={selectedType}
              onChange={e => handleTypeChange(e.target.value)}
              disabled={isFull}
            >
              <option value="">— Choose type —</option>
              {ASSESSMENT_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.icon}  {t.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className={styles.chevron} />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Custom Name</label>
          <input
            id="component-label-2021-input"
            type="text"
            className={styles.input}
            placeholder="e.g. Test 1, Assignment 2…"
            value={customLabel}
            onChange={e => setCustomLabel(e.target.value)}
            disabled={isFull}
          />
        </div>

        <div className={`${styles.field} ${styles.fieldSmall}`}>
          <label className={styles.label}>
            Max Marks
            <span style={{ color: '#7c3aed', fontSize: '0.7rem', marginLeft: 4 }}>(max {remaining > 0 ? remaining : 0})</span>
          </label>
          <input
            id="component-max-2021-input"
            type="number"
            min="1"
            max={ciaMax}
            className={styles.input}
            style={{ borderColor: maxMarks && parseFloat(maxMarks) > remaining ? '#ef4444' : undefined }}
            placeholder={`1–${remaining > 0 ? remaining : ciaMax}`}
            value={maxMarks}
            onChange={e => { setMaxMarks(e.target.value); setErrorMsg(''); }}
            disabled={isFull}
          />
        </div>

        <button
          id="add-component-2021-btn"
          className={styles.addBtn}
          style={{ background: '#7c3aed' }}
          onClick={handleAdd}
          disabled={!selectedType || !maxMarks || parseFloat(maxMarks) <= 0 || isFull}
          title={isFull ? `CIA is already at ${ciaMax} marks — remove a component to add more` : 'Add component'}
        >
          <Plus size={18} />
          Add
        </button>
      </div>

      {/* Quick pick chips */}
      <div className={styles.quickPick}>
        <span className={styles.quickLabel}>Quick add:</span>
        {ASSESSMENT_TYPES.slice(0, 6).map(t => (
          <button
            key={t.id}
            className={styles.quickChip}
            style={{ '--qc': '#7c3aed', opacity: isFull ? 0.4 : 1 }}
            onClick={() => handleTypeChange(t.id)}
            disabled={isFull}
            title={isFull ? 'CIA full — remove a component first' : `Quick add ${t.label}`}
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
          {components.map(comp => {
            const compIsOver = parseFloat(comp.max) > ciaMax;
            return (
              <div key={comp.uid} className={styles.compItem}
                style={{ background: compIsOver ? '#fef2f2' : undefined }}
              >
                <input
                  type="text"
                  className={styles.compLabelInput}
                  value={comp.label}
                  onChange={e => handleLabelChange(comp.uid, e.target.value)}
                />
                <TypeBadge typeId={comp.typeId} small />
                <div className={styles.centerCol}>
                  <input
                    type="number"
                    min="1"
                    max={ciaMax}
                    className={styles.maxInput}
                    value={comp.max}
                    onChange={e => handleMaxChange(comp.uid, e.target.value)}
                    title="Max Marks"
                    style={{ borderColor: compIsOver ? '#ef4444' : undefined }}
                  />
                </div>
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
              {isOver
                ? <AlertTriangle size={15} color="#ef4444" />
                : <CheckCircle2 size={15} color="var(--success)" />}
              <span>{components.length} component{components.length !== 1 ? 's' : ''}</span>
              <span className={styles.summarySep}>·</span>
              <span>
                CIA Total: <strong style={{ color: isOver ? '#ef4444' : '#10b981' }}>{totalMax} / {ciaMax}</strong>
              </span>
              {!isOver && remaining > 0 && (
                <>
                  <span className={styles.summarySep}>·</span>
                  <span className={styles.normalizeNote}>{remaining} marks still available</span>
                </>
              )}
              {isOver && (
                <>
                  <span className={styles.summarySep}>·</span>
                  <span style={{ color: '#ef4444', fontWeight: 600 }}>
                    ⚠️ Reduce by {totalMax - ciaMax} marks before saving!
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {components.length === 0 && (
        <div className={styles.empty}>
          <AlertCircle size={32} color="var(--text-muted)" />
          <p>No CIA components added yet.</p>
          <p className={styles.emptySub}>
            Add components summing to exactly <strong>{ciaMax} marks</strong>. No attendance marks needed.
          </p>
        </div>
      )}
    </div>
  );
}

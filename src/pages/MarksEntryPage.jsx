import { useState, useEffect } from 'react';
import { Save, RotateCcw, CheckCircle, AlertTriangle, Layers, Loader } from 'lucide-react';
import ClassSubjectSelector from '../components/MarksEntry/ClassSubjectSelector';
import ComponentBuilder from '../components/MarksEntry/ComponentBuilder';
import MarksTable from '../components/MarksEntry/MarksTable';
import { classesAPI, subjectsAPI, studentsAPI, marksAPI } from '../services/api';
import { useMarks } from '../context/MarksContext';
import { useAuth } from '../context/AuthContext';
import { INTERNAL_ASSESSMENT_MAX } from '../data/assessmentTypes';
import styles from './MarksEntryPage.module.css';

export default function MarksEntryPage() {
  const { user } = useAuth();
  const {
    selectedClassId, selectedSubjectId,
    marksData, isDirty,
    setClass, setSubject, setMark, setMarksBulk, markSaved, clearMarks,
  } = useMarks();

  // Remote data
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [students,  setStudents]  = useState([]);

  // UI state
  const [assessmentComponents, setAssessmentComponents] = useState([]);
  const [saved,   setSaved]   = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Load classes on mount ──────────────────────────────
  useEffect(() => {
    classesAPI.getAll()
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Load subjects when class changes ──────────────────
  useEffect(() => {
    if (!selectedClassId) { setSubjects([]); return; }
    subjectsAPI.getByClass(selectedClassId).then(setSubjects).catch(() => setSubjects([]));
  }, [selectedClassId]);

  // ── Load students when class changes ──────────────────
  useEffect(() => {
    if (!selectedClassId) { setStudents([]); return; }
    studentsAPI.getByClass(selectedClassId).then(setStudents).catch(() => setStudents([]));
  }, [selectedClassId]);

  // ── Load existing session when subject changes ────────
  useEffect(() => {
    if (!selectedClassId || !selectedSubjectId || !user?.id) return;
    
    setLoading(true);
    marksAPI.getSessions({ classId: selectedClassId, subjectId: selectedSubjectId })
      .then((sessions) => {
        if (sessions.length > 0) {
          // Load the latest session
          return marksAPI.getSessionDetail(sessions[0].id);
        }
        return null;
      })
      .then((detail) => {
        if (detail) {
          // Map DB components for UI
          const loadedComps = detail.components.map((c) => ({
            uid: c.id,
            typeId: c.type_id,
            label: c.label,
            max: parseFloat(c.max_marks),
            icon: c.icon,
            color: c.color,
          }));
          setAssessmentComponents(loadedComps);

          // Map DB marks to context format: { studentId: { componentUid: value } }
          const loadedMarks = {};
          detail.marks.forEach(m => {
            if (!loadedMarks[m.student_id]) loadedMarks[m.student_id] = {};
            loadedMarks[m.student_id][m.component_id] = parseFloat(m.marks_obtained);
          });
          setMarksBulk(loadedMarks);
          setSaved(true);
        } else {
          // No session found, clean slate
          setAssessmentComponents([]);
          setMarksBulk({});
          setSaved(false);
        }
      })
      .catch((err) => console.error("Failed to load existing marks:", err))
      .finally(() => setLoading(false));
  }, [selectedClassId, selectedSubjectId, user?.id]);

  // Derived
  const selectedClass   = classes.find((c) => c.id === selectedClassId);
  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId);
  const totalMax        = assessmentComponents.reduce((s, c) => s + (parseFloat(c.max) || 0), 0);
  const canEnterMarks   = selectedSubject && assessmentComponents.length > 0;

  // ── Live average (normalized to 40) ───────────────────
  const computeLiveAvg = () => {
    if (!canEnterMarks || students.length === 0 || totalMax === 0) return null;
    const totals = students.map((st) => {
      const m = marksData[st.id] || {};
      return assessmentComponents.reduce((sum, c) => sum + Math.min(parseFloat(m[c.uid]) || 0, c.max), 0);
    });
    const rawAvg = totals.reduce((s, t) => s + t, 0) / students.length;
    return ((rawAvg / totalMax) * INTERNAL_ASSESSMENT_MAX).toFixed(2);
  };

  const liveAvg = computeLiveAvg();

  // ── Save to MySQL ──────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveErr('');
    try {
      // Build marks payload: flat array of { studentId, componentIndex, marksObtained }
      const marksPayload = [];
      students.forEach((st) => {
        const m = marksData[st.id] || {};
        assessmentComponents.forEach((comp, idx) => {
          marksPayload.push({
            studentId:       st.id,
            componentIndex:  idx,
            marksObtained:   parseFloat(m[comp.uid]) || 0,
          });
        });
      });

      await marksAPI.submit({
        subjectId:     selectedSubjectId,
        classId:       selectedClassId,
        staffId:       user.id,
        sessionLabel:  `${selectedSubject.name} — Internal Assessment`,
        components:    assessmentComponents.map((c) => ({
          typeId:   c.typeId,
          label:    c.label,
          maxMarks: c.max,
          icon:     c.icon,
          color:    c.color,
        })),
        marks: marksPayload,
      });

      markSaved();
      setSaved(true);
    } catch (err) {
      setSaveErr(err.message || 'Failed to save marks.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => { clearMarks(); setSaved(false); setSaveErr(''); };

  const handleClassChange = (val) => {
    setClass(val); setAssessmentComponents([]); setSaved(false); setSaveErr('');
  };
  const handleSubjectChange = (val) => {
    setSubject(val); setAssessmentComponents([]); setSaved(false); setSaveErr('');
  };

  const step = !selectedSubject ? 1 : assessmentComponents.length === 0 ? 2 : 3;

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader size={28} className={styles.spinner} />
        <p>Loading class data from database…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Steps */}
      <div className={styles.steps}>
        {[
          { n: 1, label: 'Select Class & Subject' },
          { n: 2, label: 'Build Assessment Sheet' },
          { n: 3, label: 'Enter & Submit Marks' },
        ].map((s) => (
          <div
            key={s.n}
            className={`${styles.step} ${step === s.n ? styles.stepActive : ''} ${step > s.n ? styles.stepDone : ''}`}
          >
            <div className={styles.stepNum}>{step > s.n ? <CheckCircle size={14} /> : s.n}</div>
            <span className={styles.stepLabel}>{s.label}</span>
            {s.n < 3 && <div className={styles.stepLine} />}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      <ClassSubjectSelector
        classes={classes}
        subjects={subjects}
        selectedClass={selectedClassId}
        selectedSubject={selectedSubjectId}
        onClassChange={handleClassChange}
        onSubjectChange={handleSubjectChange}
      />

      {/* Step 2 */}
      {selectedSubject && (
        <>
          <div className={styles.subjectStrip}>
            <Layers size={16} color="var(--primary)" />
            <span>
              <strong>{selectedSubject.name}</strong> ({selectedSubject.code}) ·
              Class: <strong>{selectedClass?.name}</strong> ·
              {students.length} students
            </span>
            {liveAvg !== null && isDirty && (
              <span className={styles.liveAvg}>
                Live Avg: <strong>{liveAvg} / {INTERNAL_ASSESSMENT_MAX}</strong>
              </span>
            )}
          </div>
          <ComponentBuilder
            components={assessmentComponents}
            onChange={(comps) => { setAssessmentComponents(comps); setSaved(false); }}
          />
        </>
      )}

      {/* Step 3 */}
      {canEnterMarks && students.length > 0 && (
        <>
          <MarksTable
            students={students}
            components={assessmentComponents}
            marksData={marksData}
            onMarkChange={(sid, uid, val) => { setMark(sid, uid, val); setSaved(false); }}
          />

          {/* Action Bar */}
          <div className={styles.actionBar}>
            <div className={styles.actionLeft}>
              {saved && (
                <div className={styles.savedMsg}>
                  <CheckCircle size={16} />
                  Marks saved to database!
                </div>
              )}
              {saveErr && (
                <div className={styles.errorMsg}>
                  <AlertTriangle size={16} />
                  {saveErr}
                </div>
              )}
              {isDirty && !saved && !saveErr && (
                <div className={styles.dirtyMsg}>
                  <AlertTriangle size={16} />
                  Unsaved changes — don't forget to submit
                </div>
              )}
            </div>
            <div className={styles.actionRight}>
              <button className={styles.clearBtn} onClick={handleReset} id="clear-marks-btn">
                <RotateCcw size={15} /> Clear Marks
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !isDirty}
                id="save-marks-btn"
              >
                {saving
                  ? <><Loader size={15} className={styles.spinner} /> Saving to DB…</>
                  : <><Save size={15} /> Save & Submit</>
                }
              </button>
            </div>
          </div>
        </>
      )}

      {selectedSubject && assessmentComponents.length === 0 && (
        <div className={styles.promptBox}>
          <p>👆 Add at least one assessment component above to start entering marks.</p>
        </div>
      )}
    </div>
  );
}

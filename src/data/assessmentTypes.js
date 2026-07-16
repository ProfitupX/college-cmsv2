// =============================================
// Assessment Component Types — Staff can pick these
// when building their own marks entry sheet
// =============================================
export const ASSESSMENT_TYPES = [
  { id: 'test', label: 'Test', icon: '📝', color: '#6C63FF', suggestedMax: 25 },
  { id: 'assignment', label: 'Assignment', icon: '📋', color: '#22D3EE', suggestedMax: 20 },
  { id: 'quiz', label: 'Quiz', icon: '❓', color: '#10B981', suggestedMax: 10 },
  { id: 'practical', label: 'Practical / Lab', icon: '🔬', color: '#F472B6', suggestedMax: 25 },
  { id: 'viva', label: 'Viva / Oral', icon: '🎤', color: '#FB923C', suggestedMax: 15 },
  { id: 'seminar', label: 'Seminar / Presentation', icon: '📢', color: '#8B5CF6', suggestedMax: 10 },
  { id: 'attendance', label: 'Attendance', icon: '📅', color: '#14B8A6', suggestedMax: 10 },
  { id: 'project', label: 'Project', icon: '🚀', color: '#F59E0B', suggestedMax: 30 },
  { id: 'lab_record', label: 'Lab Record / Journal', icon: '📓', color: '#EF4444', suggestedMax: 10 },
  { id: 'model', label: 'Model Exam', icon: '🏆', color: '#3B82F6', suggestedMax: 30 },
  { id: 'case_study', label: 'Case Study', icon: '🔍', color: '#EC4899', suggestedMax: 15 },
  { id: 'participation', label: 'Class Participation', icon: '✋', color: '#A78BFA', suggestedMax: 5 },
];

// INTERNAL ASSESSMENT TOTAL — everything normalizes to 40
export const INTERNAL_ASSESSMENT_MAX = 40;

// Grade thresholds based on normalized-to-40 marks
export const GRADE_THRESHOLDS = [
  { min: 90, grade: 'O',  label: 'Outstanding', color: '#10B981' },
  { min: 80, grade: 'A+', label: 'Excellent',   color: '#6C63FF' },
  { min: 70, grade: 'A',  label: 'Very Good',   color: '#3B82F6' },
  { min: 60, grade: 'B+', label: 'Good',        color: '#22D3EE' },
  { min: 50, grade: 'B',  label: 'Average',     color: '#F59E0B' },
  { min: 40, grade: 'C',  label: 'Pass',        color: '#FB923C' },
  { min: 0,  grade: 'F',  label: 'Fail',        color: '#EF4444' },
];

export const computeGrade = (percentage) => {
  for (const t of GRADE_THRESHOLDS) {
    if (percentage >= t.min) return t;
  }
  return GRADE_THRESHOLDS[GRADE_THRESHOLDS.length - 1];
};

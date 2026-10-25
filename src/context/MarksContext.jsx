import { createContext, useContext, useReducer } from 'react';

const MarksContext = createContext(null);

const initialState = {
  activeRegulation: null, // '2025' | '2021'
  selectedClassId:   '',
  selectedSubjectId: '',
  marksData:  {},   // { studentId: { componentUid: value } }
  attendanceData: {}, // { studentId: hoursAttended }
  attendanceMarks: {}, // { studentId: convertedAttendanceMark }
  internalExamData: {}, // { studentId: internalExamMark }
  labData: {}, // { studentId: { labAttendance, labMark } }
  totalHours: 0,
  isDirty:    false,
};

function marksReducer(state, action) {
  switch (action.type) {
    case 'SET_REGULATION': {
      if (state.activeRegulation === action.payload) return state;
      return {
        ...state,
        activeRegulation: action.payload,
        selectedClassId: '',
        selectedSubjectId: '',
        marksData: {},
        attendanceData: {},
        internalExamData: {},
        labData: {},
        totalHours: 0,
        isDirty: false
      };
    }
    case 'SET_CLASS':
      if (state.selectedClassId === action.payload) return state;
      return { ...state, selectedClassId: action.payload, selectedSubjectId: '', marksData: {}, attendanceData: {}, internalExamData: {}, labData: {}, totalHours: 0, isDirty: false };
    case 'SET_SUBJECT':
      if (state.selectedSubjectId === action.payload) return state;
      return { ...state, selectedSubjectId: action.payload, marksData: {}, attendanceData: {}, internalExamData: {}, labData: {}, totalHours: 0, isDirty: false };
    case 'SET_TOTAL_HOURS':
      return { ...state, totalHours: action.payload, isDirty: true };
    case 'SET_ATTENDANCE': {
      const { studentId, hours } = action.payload;
      return {
        ...state,
        isDirty: true,
        attendanceData: {
          ...state.attendanceData,
          [studentId]: hours,
        }
      };
    }
    case 'SET_INTERNAL_EXAM': {
      const { studentId, mark } = action.payload;
      return {
        ...state,
        isDirty: true,
        internalExamData: {
          ...state.internalExamData,
          [studentId]: mark,
        }
      };
    }
    case 'SET_LAB_DATA': {
      const { studentId, field, value } = action.payload;
      return {
        ...state,
        isDirty: true,
        labData: {
          ...state.labData,
          [studentId]: {
            ...(state.labData[studentId] || {}),
            [field]: value
          }
        }
      };
    }
    case 'SET_MARK': {
      const { studentId, componentUid, value } = action.payload;
      return {
        ...state,
        isDirty: true,
        marksData: {
          ...state.marksData,
          [studentId]: {
            ...(state.marksData[studentId] || {}),
            [componentUid]: value,
          },
        },
      };
    }
    case 'SET_SESSION_BULK':
      return { 
        ...state, 
        marksData: action.payload.marks, 
        attendanceData: action.payload.attendance || {},
        attendanceMarks: action.payload.attendanceMarks || {},
        internalExamData: action.payload.internalExam || {},
        labData: action.payload.labData || {},
        totalHours: action.payload.totalHours || 0,
        isDirty: false 
      };
    case 'MARK_SAVED':
      return { ...state, isDirty: false };
    case 'CLEAR':
      return { ...state, marksData: {}, attendanceData: {}, internalExamData: {}, labData: {}, totalHours: 0, isDirty: false };
    case 'CLEAR_SELECTION':
      return { ...state, selectedClassId: '', selectedSubjectId: '', marksData: {}, attendanceData: {}, internalExamData: {}, labData: {}, totalHours: 0, isDirty: false };
    case 'SET_CLASS_AND_SUBJECT':
      if (state.selectedClassId === action.payload.classId && state.selectedSubjectId === action.payload.subjectId) return state;
      return { ...state, selectedClassId: action.payload.classId, selectedSubjectId: action.payload.subjectId, marksData: {}, attendanceData: {}, internalExamData: {}, labData: {}, totalHours: 0, isDirty: false };
    default:
      return state;
  }
}

export function MarksProvider({ children }) {
  const [state, dispatch] = useReducer(marksReducer, initialState);

  const setRegulation = (reg) => dispatch({ type: 'SET_REGULATION', payload: reg });
  const setClass      = (id)  => dispatch({ type: 'SET_CLASS',   payload: id });
  const setSubject    = (id)  => dispatch({ type: 'SET_SUBJECT', payload: id });
  const setClassAndSubject = (classId, subjectId) => dispatch({ type: 'SET_CLASS_AND_SUBJECT', payload: { classId, subjectId } });
  const setTotalHours = (hrs) => dispatch({ type: 'SET_TOTAL_HOURS', payload: hrs });
  const setAttendance = (studentId, hours) => dispatch({ type: 'SET_ATTENDANCE', payload: { studentId, hours } });
  const setInternalExam = (studentId, mark) => dispatch({ type: 'SET_INTERNAL_EXAM', payload: { studentId, mark } });
  const setLabData    = (studentId, field, value) => dispatch({ type: 'SET_LAB_DATA', payload: { studentId, field, value } });
  const setMark       = (studentId, componentUid, value) =>
    dispatch({ type: 'SET_MARK', payload: { studentId, componentUid, value } });
  const setSessionBulk = (data) => dispatch({ type: 'SET_SESSION_BULK', payload: data });
  const markSaved     = ()    => dispatch({ type: 'MARK_SAVED' });
  const clearMarks    = ()    => dispatch({ type: 'CLEAR' });
  const clearSelection = ()   => dispatch({ type: 'CLEAR_SELECTION' });

  return (
    <MarksContext.Provider value={{ 
      ...state, setRegulation, setClass, setSubject, setClassAndSubject, setTotalHours, setAttendance, setInternalExam, setLabData, setMark, setSessionBulk, markSaved, clearMarks, clearSelection 
    }}>
      {children}
    </MarksContext.Provider>
  );
}

export const useMarks = () => {
  const ctx = useContext(MarksContext);
  if (!ctx) throw new Error('useMarks must be used within MarksProvider');
  return ctx;
};

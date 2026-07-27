import { createContext, useContext, useReducer } from 'react';

const MarksContext = createContext(null);

const initialState = {
  selectedClassId:   '',
  selectedSubjectId: '',
  marksData:  {},   // { studentId: { componentUid: value } }
  attendanceData: {}, // { studentId: hoursAttended }
  internalExamData: {}, // { studentId: internalExamMark }
  labData: {}, // { studentId: { labAttendance, labMark } }
  totalHours: 0,
  isDirty:    false,
};

function marksReducer(state, action) {
  switch (action.type) {
    case 'SET_CLASS':
      return { ...state, selectedClassId: action.payload, selectedSubjectId: '', marksData: {}, attendanceData: {}, internalExamData: {}, labData: {}, totalHours: 0, isDirty: false };
    case 'SET_SUBJECT':
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
        internalExamData: action.payload.internalExam || {},
        labData: action.payload.labData || {},
        totalHours: action.payload.totalHours || 0,
        isDirty: false 
      };
    case 'MARK_SAVED':
      return { ...state, isDirty: false };
    case 'CLEAR':
      return { ...state, marksData: {}, attendanceData: {}, internalExamData: {}, labData: {}, totalHours: 0, isDirty: false };
    default:
      return state;
  }
}

export function MarksProvider({ children }) {
  const [state, dispatch] = useReducer(marksReducer, initialState);

  const setClass      = (id)  => dispatch({ type: 'SET_CLASS',   payload: id });
  const setSubject    = (id)  => dispatch({ type: 'SET_SUBJECT', payload: id });
  const setTotalHours = (hrs) => dispatch({ type: 'SET_TOTAL_HOURS', payload: hrs });
  const setAttendance = (studentId, hours) => dispatch({ type: 'SET_ATTENDANCE', payload: { studentId, hours } });
  const setInternalExam = (studentId, mark) => dispatch({ type: 'SET_INTERNAL_EXAM', payload: { studentId, mark } });
  const setLabData    = (studentId, field, value) => dispatch({ type: 'SET_LAB_DATA', payload: { studentId, field, value } });
  const setMark       = (studentId, componentUid, value) =>
    dispatch({ type: 'SET_MARK', payload: { studentId, componentUid, value } });
  const setSessionBulk = (data) => dispatch({ type: 'SET_SESSION_BULK', payload: data });
  const markSaved     = ()    => dispatch({ type: 'MARK_SAVED' });
  const clearMarks    = ()    => dispatch({ type: 'CLEAR' });

  return (
    <MarksContext.Provider value={{ 
      ...state, setClass, setSubject, setTotalHours, setAttendance, setInternalExam, setLabData, setMark, setSessionBulk, markSaved, clearMarks 
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

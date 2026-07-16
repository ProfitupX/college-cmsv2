import { createContext, useContext, useReducer } from 'react';

const MarksContext = createContext(null);

const initialState = {
  selectedClassId:   '',
  selectedSubjectId: '',
  marksData:  {},   // { studentId: { componentUid: value } }
  isDirty:    false,
};

function marksReducer(state, action) {
  switch (action.type) {
    case 'SET_CLASS':
      return { ...state, selectedClassId: action.payload, selectedSubjectId: '', marksData: {}, isDirty: false };
    case 'SET_SUBJECT':
      return { ...state, selectedSubjectId: action.payload, marksData: {}, isDirty: false };
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
    case 'SET_MARKS_BULK':
      return { ...state, marksData: action.payload, isDirty: false };
    case 'MARK_SAVED':
      return { ...state, isDirty: false };
    case 'CLEAR':
      return { ...state, marksData: {}, isDirty: false };
    default:
      return state;
  }
}

export function MarksProvider({ children }) {
  const [state, dispatch] = useReducer(marksReducer, initialState);

  const setClass    = (id)  => dispatch({ type: 'SET_CLASS',   payload: id });
  const setSubject  = (id)  => dispatch({ type: 'SET_SUBJECT', payload: id });
  const setMark     = (studentId, componentUid, value) =>
    dispatch({ type: 'SET_MARK', payload: { studentId, componentUid, value } });
  const setMarksBulk = (data) => dispatch({ type: 'SET_MARKS_BULK', payload: data });
  const markSaved   = ()    => dispatch({ type: 'MARK_SAVED' });
  const clearMarks  = ()    => dispatch({ type: 'CLEAR' });

  return (
    <MarksContext.Provider value={{ ...state, setClass, setSubject, setMark, setMarksBulk, markSaved, clearMarks }}>
      {children}
    </MarksContext.Provider>
  );
}

export const useMarks = () => {
  const ctx = useContext(MarksContext);
  if (!ctx) throw new Error('useMarks must be used within MarksProvider');
  return ctx;
};

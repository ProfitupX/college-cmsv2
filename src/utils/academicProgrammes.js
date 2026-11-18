/**
 * =====================================================================================
 * MARKHUB ACADEMIC ARCHITECTURE REGISTRY
 * Nadar Saraswathi College of Engineering & Technology (NSCET)
 * 
 * Formal Academic Structure:
 * - 8 Undergraduate (UG) Departments
 * - 4 Postgraduate (PG) Programmes
 * - Total: 12 Academic Units
 * 
 * Governance:
 * - UG Departments and PG Programmes are decoupled, distinct academic concepts.
 * - PG Programmes are NOT additional UG departments.
 * - Every PG Programme supports both I Year (Sem I, II) and II Year (Sem III, IV).
 * - Delimiter-agnostic class recognition maps existing production and future classes.
 * =====================================================================================
 */

/**
 * 1. The Eight (8) Undergraduate Departments
 */
export const UG_DEPARTMENTS = [
  {
    id: 'CSE',
    code: 'CSE',
    name: 'Computer Science and Engineering',
    shortName: 'CSE',
    degreeTitle: 'B.E.',
    degreeLevel: 'UG',
    durationYears: 4,
    totalSemesters: 8,
    years: ['I', 'II', 'III', 'IV'],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#2563EB',
    icon: '💻'
  },
  {
    id: 'IT',
    code: 'IT',
    name: 'Information Technology',
    shortName: 'IT',
    degreeTitle: 'B.Tech',
    degreeLevel: 'UG',
    durationYears: 4,
    totalSemesters: 8,
    years: ['I', 'II', 'III', 'IV'],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#06B6D4',
    icon: '🌐'
  },
  {
    id: 'AIDS',
    code: 'AIDS',
    name: 'Artificial Intelligence and Data Science',
    shortName: 'AI & DS',
    degreeTitle: 'B.Tech',
    degreeLevel: 'UG',
    durationYears: 4,
    totalSemesters: 8,
    years: ['I', 'II', 'III', 'IV'],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#8B5CF6',
    icon: '🤖'
  },
  {
    id: 'ECE',
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    shortName: 'ECE',
    degreeTitle: 'B.E.',
    degreeLevel: 'UG',
    durationYears: 4,
    totalSemesters: 8,
    years: ['I', 'II', 'III', 'IV'],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#EC4899',
    icon: '📡'
  },
  {
    id: 'EEE',
    code: 'EEE',
    name: 'Electrical and Electronics Engineering',
    shortName: 'EEE',
    degreeTitle: 'B.E.',
    degreeLevel: 'UG',
    durationYears: 4,
    totalSemesters: 8,
    years: ['I', 'II', 'III', 'IV'],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#F59E0B',
    icon: '⚡'
  },
  {
    id: 'CIVIL',
    code: 'CIVIL',
    name: 'Civil Engineering',
    shortName: 'Civil',
    degreeTitle: 'B.E.',
    degreeLevel: 'UG',
    durationYears: 4,
    totalSemesters: 8,
    years: ['I', 'II', 'III', 'IV'],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#10B981',
    icon: '🏗️'
  },
  {
    id: 'MECH',
    code: 'MECH',
    name: 'Mechanical Engineering',
    shortName: 'Mech',
    degreeTitle: 'B.E.',
    degreeLevel: 'UG',
    durationYears: 4,
    totalSemesters: 8,
    years: ['I', 'II', 'III', 'IV'],
    semesters: [1, 2, 3, 4, 5, 6, 7, 8],
    color: '#EF4444',
    icon: '⚙️'
  },
  {
    id: 'SH',
    code: 'SH',
    name: 'Science and Humanities',
    shortName: 'S&H (1st Yr)',
    degreeTitle: 'B.E. / B.Tech',
    degreeLevel: 'UG',
    durationYears: 1,
    totalSemesters: 2,
    years: ['I'],
    semesters: [1, 2],
    color: '#6366F1',
    icon: '🔬'
  }
];

/**
 * 2. The Four (4) Postgraduate Programmes
 * Applicable Regulation: Anna University M.E. PG Regulation 2025
 */
export const PG_PROGRAMMES = [
  {
    id: 'ME_CSE',
    code: 'ME_CSE',
    name: 'M.E. Computer Science and Engineering',
    shortName: 'M.E. CSE',
    degreeTitle: 'M.E.',
    degreeLevel: 'PG',
    regulation: '2025',
    durationYears: 2,
    totalSemesters: 4,
    years: ['I', 'II'],
    semesters: [1, 2, 3, 4],
    yearSemesters: {
      'I': [1, 2],
      'II': [3, 4]
    },
    owningDepartment: 'Computer Science and Engineering',
    owningDeptCode: 'CSE',
    color: '#4F46E5',
    icon: '🎓',
    applicableCourseTypes: ['Theory', 'Theory-cum-Lab', 'Practical'],
    productionClassIds: ['CL_1794306342'],
    canonicalClassIds: ['ME_CSE_I', 'ME_CSE_II', 'ME_CSE_III', 'ME_CSE_IV']
  },
  {
    id: 'ME_EST',
    code: 'ME_EST',
    name: 'M.E. Embedded System Technologies',
    shortName: 'M.E. EST',
    degreeTitle: 'M.E.',
    degreeLevel: 'PG',
    regulation: '2025',
    durationYears: 2,
    totalSemesters: 4,
    years: ['I', 'II'],
    semesters: [1, 2, 3, 4],
    yearSemesters: {
      'I': [1, 2],
      'II': [3, 4]
    },
    owningDepartment: 'Electronics and Communication Engineering',
    owningDeptCode: 'ECE',
    color: '#D946EF',
    icon: '🔬',
    applicableCourseTypes: ['Theory', 'Theory-cum-Lab', 'Practical'],
    productionClassIds: ['CL_1794909437'],
    canonicalClassIds: ['ME_EST_I', 'ME_EST_II', 'ME_EST_III', 'ME_EST_IV']
  },
  {
    id: 'ME_SE',
    code: 'ME_SE',
    name: 'M.E. Structural Engineering',
    shortName: 'M.E. SE',
    degreeTitle: 'M.E.',
    degreeLevel: 'PG',
    regulation: '2025',
    durationYears: 2,
    totalSemesters: 4,
    years: ['I', 'II'],
    semesters: [1, 2, 3, 4],
    yearSemesters: {
      'I': [1, 2],
      'II': [3, 4]
    },
    owningDepartment: 'Civil Engineering',
    owningDeptCode: 'CIVIL',
    color: '#059669',
    icon: '🏛️',
    applicableCourseTypes: ['Theory', 'Theory-cum-Lab', 'Practical', 'Project'],
    productionClassIds: ['CL_1794909933', 'CL_1794909988'],
    canonicalClassIds: ['ME_SE_I', 'ME_SE_II', 'ME_SE_III', 'ME_SE_IV']
  },
  {
    id: 'ME_MFE',
    code: 'ME_MFE',
    name: 'M.E. Manufacturing Engineering',
    shortName: 'M.E. MFE',
    degreeTitle: 'M.E.',
    degreeLevel: 'PG',
    regulation: '2025',
    durationYears: 2,
    totalSemesters: 4,
    years: ['I', 'II'],
    semesters: [1, 2, 3, 4],
    yearSemesters: {
      'I': [1, 2],
      'II': [3, 4]
    },
    owningDepartment: 'Mechanical Engineering',
    owningDeptCode: 'MECH',
    color: '#EA580C',
    icon: '🏭',
    applicableCourseTypes: ['Theory', 'Theory-cum-Lab', 'Practical', 'Project'],
    productionClassIds: ['CL_1794910479', 'CL_1794910622'],
    canonicalClassIds: ['ME_MFE_I', 'ME_MFE_II', 'ME_MFE_III', 'ME_MFE_IV']
  }
];

/**
 * 3. Academic Structure Metrics Summary
 */
export const ACADEMIC_UNITS_METRICS = {
  ugDepartmentsCount: UG_DEPARTMENTS.length, // 8
  pgProgrammesCount: PG_PROGRAMMES.length,   // 4
  totalAcademicUnits: UG_DEPARTMENTS.length + PG_PROGRAMMES.length // 12
};

/**
 * 4. Helper: Find PG Programme by Class
 * Maps any class object (production, canonical, or future) to its PG Programme.
 */
export const getPGProgrammeByClass = (classObj) => {
  if (!classObj) return null;

  const obj = typeof classObj === 'string' ? { id: classObj, name: classObj } : classObj;
  const idStr = String(obj.id || obj.class_id || obj.classId || '').trim();
  const nameStr = String(obj.name || obj.class_name || obj.className || '').trim().toUpperCase();

  // 1. Direct production class ID match
  for (const prog of PG_PROGRAMMES) {
    if (prog.productionClassIds.includes(idStr)) return prog;
    if (prog.canonicalClassIds.includes(idStr)) return prog;
    if (obj.program_code === prog.code || obj.programCode === prog.code) return prog;
  }

  // 2. Class ID pattern match
  if (/^ME[_\-\/]CSE/i.test(idStr)) return PG_PROGRAMMES.find(p => p.code === 'ME_CSE');
  if (/^ME[_\-\/]EST/i.test(idStr)) return PG_PROGRAMMES.find(p => p.code === 'ME_EST');
  if (/^ME[_\-\/]SE/i.test(idStr))  return PG_PROGRAMMES.find(p => p.code === 'ME_SE');
  if (/^ME[_\-\/]MFE/i.test(idStr)) return PG_PROGRAMMES.find(p => p.code === 'ME_MFE');

  // 3. Name pattern match (Negative lookahead guarantees UG Mechanical is excluded)
  if (/^MECH\b|^MECHANICAL\b/i.test(nameStr)) return null;

  // Structural Engineering
  if (
    /STRUCTURAL/i.test(nameStr) ||
    /^ME[\s_\-\/:]*SE\b/i.test(nameStr) ||
    /\bSE[_\-\/:]?(1|I|II|III|IV)\b/i.test(nameStr) && /ME/i.test(nameStr)
  ) {
    return PG_PROGRAMMES.find(p => p.code === 'ME_SE');
  }

  // Manufacturing Engineering
  if (
    /MANUFACTURING/i.test(nameStr) ||
    /^ME[\s_\-\/:]*MFE\b/i.test(nameStr)
  ) {
    return PG_PROGRAMMES.find(p => p.code === 'ME_MFE');
  }

  // Embedded System Technologies
  if (
    /EMBEDDED/i.test(nameStr) ||
    /^ME[\s_\-\/:]*EST\b/i.test(nameStr)
  ) {
    return PG_PROGRAMMES.find(p => p.code === 'ME_EST');
  }

  // Computer Science & Engineering (PG)
  if (
    (/^ME[\s_\-\/:]/i.test(nameStr) && /CSE\b|COMPUTER/i.test(nameStr)) ||
    /\bM\.?E\.?[\s_\-]+.*(CSE|COMPUTER)/i.test(nameStr)
  ) {
    return PG_PROGRAMMES.find(p => p.code === 'ME_CSE');
  }

  return null;
};

/**
 * 5. Helper: Map Class to Academic Unit
 */
export const mapClassToAcademicUnit = (classObj) => {
  const pgProg = getPGProgrammeByClass(classObj);
  if (pgProg) {
    return {
      isPG: true,
      unitType: 'PG_PROGRAMME',
      academicUnit: pgProg,
      label: pgProg.name,
      shortLabel: pgProg.shortName
    };
  }

  const deptStr = String(classObj?.department || '').trim();
  const ugDept = UG_DEPARTMENTS.find(d => 
    d.name.toLowerCase() === deptStr.toLowerCase() ||
    d.shortName.toLowerCase() === deptStr.toLowerCase() ||
    d.code.toLowerCase() === deptStr.toLowerCase()
  ) || UG_DEPARTMENTS.find(d => d.code === 'SH');

  return {
    isPG: false,
    unitType: 'UG_DEPARTMENT',
    academicUnit: ugDept,
    label: ugDept ? ugDept.name : deptStr,
    shortLabel: ugDept ? ugDept.shortName : deptStr
  };
};

/**
 * 6. Helper: Get Status and Structure for a PG Programme
 * Returns active classes, batch info, and flags future batches cleanly.
 */
export const getPGProgrammeYearStatus = (progCode, yearLabel, allClasses = []) => {
  const prog = PG_PROGRAMMES.find(p => p.code === progCode);
  if (!prog) return null;

  const validSemesters = prog.yearSemesters[yearLabel] || [];
  
  const matchingClasses = allClasses.filter(c => {
    const classProg = getPGProgrammeByClass(c);
    if (!classProg || classProg.code !== progCode) return false;
    return String(c.year_label || '').toUpperCase() === yearLabel || validSemesters.includes(parseInt(c.semester, 10));
  });

  const totalStudents = matchingClasses.reduce((sum, c) => sum + (parseInt(c.student_count, 10) || 0), 0);
  const hasActiveClasses = matchingClasses.length > 0;

  return {
    programme: prog,
    yearLabel,
    semesters: validSemesters,
    hasActiveClasses,
    isFutureBatch: !hasActiveClasses,
    classes: matchingClasses,
    studentCount: totalStudents,
    academicBatch: matchingClasses[0]?.batch || (yearLabel === 'I' ? '2026-2028' : '2025-2027')
  };
};

/**
 * 7. Helper: Find PG Programme by Owning Department
 * Maps an HOD's department (e.g. 'Computer Science and Engineering', 'CSE', 'Civil Engineering', etc.)
 * to its owning PG programme. Returns null for departments without a PG programme (IT, AI&DS, EEE, S&H).
 */
export const getPGProgrammeByOwningDepartment = (deptNameOrCode) => {
  if (!deptNameOrCode) return null;
  const dStr = String(deptNameOrCode).trim().toLowerCase();

  return PG_PROGRAMMES.find(prog => {
    const ownName = prog.owningDepartment.toLowerCase();
    const ownCode = prog.owningDeptCode.toLowerCase();
    if (dStr === ownName || dStr === ownCode) return true;
    if (ownCode === 'cse' && (dStr.includes('computer') || dStr === 'cse')) return true;
    if (ownCode === 'ece' && (dStr.includes('electronics and communication') || dStr === 'ece')) return true;
    if (ownCode === 'civil' && (dStr.includes('civil') || dStr === 'civil')) return true;
    if (ownCode === 'mech' && (dStr.includes('mechanical') || dStr === 'mech')) return true;
    return false;
  }) || null;
};


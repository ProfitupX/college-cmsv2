import ExcelJS from 'exceljs';
import logoImg from '../assets/nscetimg.jpeg';

// Helper to convert image URL or import to pure base64 (without prefix)
const getImageBase64 = (url) => {
  return new Promise((resolve) => {
    try {
      if (!url) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const dataUrl = canvas.toDataURL('image/jpeg');
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        } catch (e) {
          console.warn('Canvas base64 extraction failed:', e);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch (e) {
      resolve(null);
    }
  });
};

const triggerDownload = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

const applyThinBorders = (cell) => {
  cell.border = {
    top: { style: 'thin', color: { argb: 'CBD5E1' } },
    left: { style: 'thin', color: { argb: 'CBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
    right: { style: 'thin', color: { argb: 'CBD5E1' } },
  };
};

/**
 * 1. Export Subject Marks List (With or Without Assignment Marks)
 */
export const exportSubjectMarksExcel = async ({
  subject,
  classObj,
  staff,
  session,
  students = [],
  marksData = {},
  attendanceData = {},
  attendanceMarks = {},
  internalExamData = {},
  labData = {},
  assessmentMode = 'internal1',
  components = [],
  totalHours = 30,
  int1Hours = 30,
  int2Hours = 30,
  labHours = 0,
  int1AttendanceData = {},
  withInternal = true,
  theoryCumLabMode = 'assignment_lab_only',
  showWrittenExamInPdf = false,
  user
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Subject Marks List');

  const isInternal2 = assessmentMode === 'internal2';
  const hasLab = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type);

  const tHours = !isInternal2
    ? parseInt(int1Hours || 30, 10)
    : (parseInt(int1Hours || 30, 10) + parseInt(int2Hours || 30, 10) + (hasLab ? parseInt(labHours || 40, 10) : 0));

  const getAttendanceMark = (pct) => {
    if (pct >= 95) return 5;
    if (pct >= 90) return 3;
    if (pct >= 85) return 2;
    if (pct >= 80) return 1;
    return 0;
  };

  const modeLabel = assessmentMode === 'internal1' ? 'INTERNAL ASSESSMENT 1' : 'INTERNAL ASSESSMENT 2';
  const typeLabel = withInternal ? 'WITH ASSIGNMENT MARKS' : 'WITHOUT ASSIGNMENT MARKS';
  const staffName = staff?.name || subject?.faculty_name || subject?.staff_name || 'Faculty Staff';

  // Embed Logo
  const logoBase64 = await getImageBase64(logoImg);
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'jpeg',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.2, row: 0.2 },
      ext: { width: 75, height: 75 }
    });
  }

  // Header Title Block
  worksheet.mergeCells('B1:J1');
  const titleCell1 = worksheet.getCell('B1');
  titleCell1.value = 'NADAR SARASWATHI COLLEGE OF ENGINEERING & TECHNOLOGY, THENI';
  titleCell1.font = { name: 'Arial', size: 13, bold: true, color: { argb: '1E3A8A' } };
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B2:J2');
  const titleCell2 = worksheet.getCell('B2');
  titleCell2.value = 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai';
  titleCell2.font = { name: 'Arial', size: 9, italic: true, color: { argb: '475569' } };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B3:J3');
  const titleCell3 = worksheet.getCell('B3');
  titleCell3.value = `${modeLabel} — SUBJECT MARKS LIST (${typeLabel})`;
  titleCell3.font = { name: 'Arial', size: 11, bold: true, color: { argb: '0F172A' } };
  titleCell3.alignment = { horizontal: 'center', vertical: 'middle' };

  // Set Row Heights for Title
  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 10; // spacer

  // Metadata Block (Rows 5-7)
  const metaData = [
    ['Year / Semester:', `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, '', '', 'Department:', subject?.department || classObj?.department || 'Information Technology'],
    ['Faculty Name:', staffName, '', '', 'Academic Year:', '2026 - 2027'],
    ['Subject Code / Name:', `${subject?.code || ''} — ${subject?.name || ''}`, '', '', 'Total Prescribed Hrs:', `${tHours} Hours`]
  ];

  metaData.forEach((row, i) => {
    const r = worksheet.getRow(5 + i);
    r.values = row;
    r.font = { name: 'Arial', size: 9, bold: false };
    r.getCell(1).font = { bold: true };
    r.getCell(5).font = { bold: true };
    r.height = 18;
  });

  worksheet.getRow(8).height = 8; // spacer

  // Table Column Headers
  let headers = [];
  const isLabAssignmentOnly = isInternal2 && hasLab && theoryCumLabMode === 'assignment_lab_only' && !showWrittenExamInPdf;

  if (withInternal) {
    if (isLabAssignmentOnly) {
      headers = [
        'S.No', 'Roll No', 'Student Name', 'Actual Attd (Hrs)', `Attended (/ ${tHours})`, 'Attd %',
        'Attd Mark (5)', 'Assignment / Act (50)', 'Lab Exam Mark (50)', 'Total Internal (100)'
      ];
    } else {
      headers = [
        'S.No', 'Roll No', 'Student Name', 'Actual Attd (Hrs)', `Attended (/ ${tHours})`, 'Attd %',
        'Attd Mark (5)', 'Assignment / Act (95)', 'Total Internal (Act + Attd)', '100 Marks Internal (Exam)'
      ];
    }
  } else {
    headers = [
      'S.No', 'Roll No', 'Student Name', 'Actual Attd (Hrs)', `Attended (/ ${tHours})`, 'Attd %',
      'Written Exam Mark (/ 100)', 'Result (Pass / Fail)'
    ];
  }

  const headerRow = worksheet.getRow(9);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(cell);
  });

  // Populate Student Rows
  let currentRow = 10;
  students.forEach((student, idx) => {
    let convertedTotal = 0;
    (components || []).forEach(c => {
      const val = parseFloat(marksData[student.id]?.[c.uid || c.id]) || 0;
      const conducted = parseFloat(c.conductedMax || c.conducted_max) || 100;
      convertedTotal += Math.min(val, conducted);
    });
    convertedTotal = Math.round(convertedTotal);

    let rawHours = 0;
    let pct = 0;
    let attendanceMark = 0;

    if (!isInternal2) {
      rawHours = parseInt(attendanceData[student.id] || 0, 10);
      pct = tHours > 0 ? Math.min(100, Math.round((rawHours / tHours) * 100)) : 0;
      attendanceMark = (attendanceMarks && attendanceMarks[student.id] !== undefined && parseFloat(attendanceMarks[student.id]) > 0)
        ? parseFloat(attendanceMarks[student.id])
        : getAttendanceMark(pct);
    } else {
      const i1Attd = parseInt(int1AttendanceData[student.id] || 0, 10);
      const i2Attd = parseInt(attendanceData[student.id] || 0, 10);
      const lAttd  = hasLab ? parseInt(labData[student.id]?.labAttendance || 0, 10) : 0;
      rawHours = i1Attd + i2Attd + lAttd;
      pct = tHours > 0 ? Math.min(100, Math.round((rawHours / tHours) * 100)) : 0;
      attendanceMark = (attendanceMarks && attendanceMarks[student.id] !== undefined && parseFloat(attendanceMarks[student.id]) > 0)
        ? parseFloat(attendanceMarks[student.id])
        : getAttendanceMark(pct);
    }

    const cappedHours = Math.min(rawHours, tHours);
    const examMark = internalExamData ? internalExamData[student.id] : undefined;
    const numExam = parseFloat(examMark);
    const isExamAbsent = isNaN(numExam) || examMark === null || examMark === undefined || examMark === '' || examMark === 'AB';
    const examMarkStr = isExamAbsent ? 'AB' : Math.round(numExam);

    const labRaw = parseFloat(labData[student.id]?.labMark) || 0;
    const labConverted = Math.round((labRaw / 100) * 50);

    const totalInternal = Math.min(100, convertedTotal + attendanceMark);
    const cleanName = String(student.name || '').replace(/ð[^\s]*/g, '').trim();

    let rowValues = [];
    if (withInternal) {
      if (isLabAssignmentOnly) {
        const act50 = Math.round((convertedTotal / 95) * 50);
        const combLabAct = act50 + labConverted;
        rowValues = [
          idx + 1,
          student.roll_no || student.rollNo || '-',
          cleanName,
          rawHours,
          cappedHours,
          `${pct}%`,
          attendanceMark,
          act50,
          labConverted,
          combLabAct
        ];
      } else {
        rowValues = [
          idx + 1,
          student.roll_no || student.rollNo || '-',
          cleanName,
          rawHours,
          cappedHours,
          `${pct}%`,
          attendanceMark,
          convertedTotal,
          totalInternal,
          examMarkStr
        ];
      }
    } else {
      const isPass = !isExamAbsent && parseInt(examMarkStr, 10) >= 50;
      const resultStr = isExamAbsent ? 'AB' : (isPass ? 'PASS' : 'FAIL');
      rowValues = [
        idx + 1,
        student.roll_no || student.rollNo || '-',
        cleanName,
        rawHours,
        cappedHours,
        `${pct}%`,
        examMarkStr,
        resultStr
      ];
    }

    const dataRow = worksheet.getRow(currentRow);
    dataRow.values = rowValues;
    dataRow.height = 20;

    const isEven = (idx % 2 === 0);
    const bg = isEven ? 'FFFFFF' : 'F8FAFC';

    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      applyThinBorders(cell);

      if (colNumber === 1 || colNumber === 2 || colNumber >= 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      }

      // Highlight Pass/Fail
      if (!withInternal && colNumber === 8) {
        if (cell.value === 'PASS') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '166534' } };
        } else if (cell.value === 'FAIL') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '991B1B' } };
        }
      }
    });

    currentRow++;
  });

  // Criteria Row
  const criteriaRow = worksheet.getRow(currentRow);
  if (withInternal) {
    if (isLabAssignmentOnly) {
      criteriaRow.values = ['', '', 'MAX MARKS', `${tHours} Hrs`, `${tHours} Hrs`, '100%', 5, 50, 50, 100];
    } else {
      criteriaRow.values = ['', '', 'MAX MARKS', `${tHours} Hrs`, `${tHours} Hrs`, '100%', 5, 95, 100, 100];
    }
  } else {
    criteriaRow.values = ['', '', 'MAX MARKS / CRITERIA', `${tHours} Hrs`, `${tHours} Hrs`, '100%', 100, '>= 50% PASS'];
  }
  criteriaRow.height = 20;
  criteriaRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(cell);
  });
  currentRow += 3;

  // Signatures
  const sigRow = worksheet.getRow(currentRow);
  sigRow.values = ['', 'SUBJECT FACULTY', '', '', 'CLASS IN-CHARGE', '', '', 'HOD', '', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Column Widths
  worksheet.columns = [
    { width: 7 },   // S.No
    { width: 17 },  // Roll No
    { width: 32 },  // Student Name
    { width: 15 },  // Actual Attd
    { width: 15 },  // Attended
    { width: 11 },  // Attd %
    { width: 13 },  // Attd Mark
    { width: 22 },  // Assignment / Act
    { width: 22 },  // Total Internal
    { width: 18 }   // Exam
  ];

  const filename = `${subject?.code || 'SUB'}_${assessmentMode}_Marks_${withInternal ? 'With_Assignment' : 'Without_Assignment'}.xlsx`;
  await triggerDownload(workbook, filename);
};

/**
 * 2. Export Laboratory Marks Statement Only (Lab Attended Hours & Lab Marks)
 */
export const exportLaboratoryMarksExcel = async ({
  subject,
  classObj,
  staff,
  session,
  students = [],
  attendanceData = {},
  labData = {},
  internalExamData = {},
  totalHours = 0,
  labHours = 0,
  assessmentMode = 'internal1',
  user
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Laboratory Marks');

  const staffName = staff?.name || subject?.faculty_name || subject?.staff_name || 'Faculty Staff';
  const prescribedLabHours = parseInt(labHours || 0, 10) || 40;

  // Embed Logo
  const logoBase64 = await getImageBase64(logoImg);
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'jpeg',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.2, row: 0.2 },
      ext: { width: 75, height: 75 }
    });
  }

  // Header Title Block
  worksheet.mergeCells('B1:F1');
  const titleCell1 = worksheet.getCell('B1');
  titleCell1.value = 'NADAR SARASWATHI COLLEGE OF ENGINEERING & TECHNOLOGY, THENI';
  titleCell1.font = { name: 'Arial', size: 13, bold: true, color: { argb: '1E3A8A' } };
  titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B2:F2');
  const titleCell2 = worksheet.getCell('B2');
  titleCell2.value = 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai';
  titleCell2.font = { name: 'Arial', size: 9, italic: true, color: { argb: '475569' } };
  titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B3:F3');
  const titleCell3 = worksheet.getCell('B3');
  titleCell3.value = `LABORATORY / PRACTICAL MARKS STATEMENT — ${assessmentMode === 'internal2' ? 'INTERNAL 2' : 'INTERNAL 1'}`;
  titleCell3.font = { name: 'Arial', size: 11, bold: true, color: { argb: '0F172A' } };
  titleCell3.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 10;

  // Metadata Block
  const metaData = [
    ['Year / Semester:', `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, '', 'Department:', subject?.department || classObj?.department || 'Information Technology'],
    ['Staff In-Charge:', staffName, '', 'Academic Year:', '2026 - 2027'],
    ['Subject Code / Name:', `${subject?.code || ''} — ${subject?.name || ''}`, '', 'Prescribed Lab Hrs:', `${prescribedLabHours} Hours`]
  ];

  metaData.forEach((row, i) => {
    const r = worksheet.getRow(5 + i);
    r.values = row;
    r.font = { name: 'Arial', size: 9 };
    r.getCell(1).font = { bold: true };
    r.getCell(4).font = { bold: true };
    r.height = 18;
  });

  worksheet.getRow(8).height = 8;

  // Table Headers
  const headerRow = worksheet.getRow(9);
  headerRow.values = ['S.No', 'Roll No', 'Student Name', `Lab Attended Hours (/ ${prescribedLabHours})`, 'Lab Marks (/ 100)', 'Result (Pass / Fail)'];
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(cell);
  });

  // Rows
  let currentRow = 10;
  students.forEach((st, idx) => {
    let attendedHours = 0;
    if (labData[st.id]?.labAttendance !== undefined && labData[st.id]?.labAttendance !== null && labData[st.id]?.labAttendance !== '') {
      attendedHours = parseInt(labData[st.id].labAttendance, 10);
    } else if (attendanceData[st.id] !== undefined && attendanceData[st.id] !== null && attendanceData[st.id] !== '') {
      attendedHours = parseInt(attendanceData[st.id], 10);
    }
    const cleanHours = Math.min(attendedHours, prescribedLabHours);

    let rawLabMark = null;
    if (labData[st.id]?.labMark !== undefined && labData[st.id]?.labMark !== null && labData[st.id]?.labMark !== '') {
      rawLabMark = labData[st.id].labMark;
    } else if (internalExamData[st.id] !== undefined && internalExamData[st.id] !== null && internalExamData[st.id] !== '') {
      rawLabMark = internalExamData[st.id];
    }

    const numMark = parseFloat(rawLabMark);
    const isAbsent = isNaN(numMark) || rawLabMark === null || rawLabMark === '' || rawLabMark === 'AB';
    const markDisplay = isAbsent ? 'AB' : Math.round(numMark);
    const result = isAbsent ? 'AB' : (numMark >= 50 ? 'PASS' : 'FAIL');
    const cleanName = String(st.name || '').replace(/ð[^\s]*/g, '').trim();

    const dataRow = worksheet.getRow(currentRow);
    dataRow.values = [
      idx + 1,
      st.roll_no || st.rollNo || '-',
      cleanName,
      cleanHours,
      markDisplay,
      result
    ];
    dataRow.height = 20;

    const bg = (idx % 2 === 0) ? 'FFFFFF' : 'F8FAFC';
    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      applyThinBorders(cell);

      if (colNumber === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      if (colNumber === 6) {
        if (cell.value === 'PASS') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '166534' } };
        } else if (cell.value === 'FAIL') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '991B1B' } };
        }
      }
    });

    currentRow++;
  });

  // Criteria
  const critRow = worksheet.getRow(currentRow);
  critRow.values = ['', '', 'CRITERIA / MAX', `${prescribedLabHours} Hours`, 100, '>= 50% PASS'];
  critRow.height = 20;
  critRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2E8F0' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(cell);
  });
  currentRow += 3;

  // Signatures
  const sigRow = worksheet.getRow(currentRow);
  sigRow.values = ['', 'LAB IN-CHARGE', '', 'HOD', '', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  worksheet.columns = [
    { width: 7 },
    { width: 17 },
    { width: 34 },
    { width: 28 },
    { width: 18 },
    { width: 18 }
  ];

  await triggerDownload(workbook, `${subject?.code || 'SUB'}_Laboratory_Marks_Statement.xlsx`);
};

/**
 * 3. Export ExamCell Legal Statement (Overall Marks & Attendance)
 */
export const exportOverallMarksExcel = async ({
  classObj,
  sessionLabel = 'internal1',
  subjects = [],
  students = [],
  allSessions = [],
  allAttendance = [],
  allMarks = [],
  allComponents = [],
  withInternal = true,
  user
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('ExamCell Legal Statement');

  const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
  const targetSubjects = subjects.filter(s => s.code !== 'LIB' && s.name?.toUpperCase() !== 'LIBRARY');

  // Embed Logo
  const logoBase64 = await getImageBase64(logoImg);
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'jpeg',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0.2, row: 0.2 },
      ext: { width: 75, height: 75 }
    });
  }

  // Titles
  worksheet.mergeCells('B1:N1');
  const t1 = worksheet.getCell('B1');
  t1.value = 'NADAR SARASWATHI COLLEGE OF ENGINEERING & TECHNOLOGY, THENI';
  t1.font = { name: 'Arial', size: 13, bold: true, color: { argb: '1E3A8A' } };
  t1.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B2:N2');
  const t2 = worksheet.getCell('B2');
  t2.value = 'Approved by AICTE, New Delhi & Affiliated to Anna University, Chennai';
  t2.font = { name: 'Arial', size: 9, italic: true, color: { argb: '475569' } };
  t2.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.mergeCells('B3:N3');
  const t3 = worksheet.getCell('B3');
  t3.value = `EXAMCELL LEGAL STATEMENT — ${sessionLabel === 'internal2' ? 'INTERNAL ASSESSMENT 2' : 'INTERNAL ASSESSMENT 1'} (${withInternal ? 'WITH ASSIGNMENT MARKS' : 'WITHOUT ASSIGNMENT MARKS'})`;
  t3.font = { name: 'Arial', size: 11, bold: true, color: { argb: '0F172A' } };
  t3.alignment = { horizontal: 'center', vertical: 'middle' };

  worksheet.getRow(1).height = 24;
  worksheet.getRow(2).height = 18;
  worksheet.getRow(3).height = 22;
  worksheet.getRow(4).height = 10;

  // Metadata
  const meta = [
    ['Class / Year / Sem:', `${classObj?.name || 'Class'} (${classObj?.year_label || 'II'} / Sem ${classObj?.semester || '4'})`, '', '', 'Department:', classObj?.department || 'Information Technology'],
    ['Regulation:', is2021 ? '2021 Regulation' : '2025 Regulation', '', '', 'Academic Year:', '2026 - 2027'],
    ['Total Subjects:', targetSubjects.length, '', '', 'Generated Date:', new Date().toLocaleDateString('en-GB')]
  ];

  meta.forEach((row, idx) => {
    const r = worksheet.getRow(5 + idx);
    r.values = row;
    r.font = { name: 'Arial', size: 9 };
    r.getCell(1).font = { bold: true };
    r.getCell(5).font = { bold: true };
    r.height = 18;
  });

  worksheet.getRow(8).height = 8;

  // Header Rows (Row 9: Top Subject Codes, Row 10: Subcolumns)
  const row9 = worksheet.getRow(9);
  const row10 = worksheet.getRow(10);
  row9.height = 24;
  row10.height = 24;

  let colIdx = 1;
  // S.No
  worksheet.mergeCells(9, colIdx, 10, colIdx);
  worksheet.getCell(9, colIdx).value = 'S.No';
  colIdx++;

  // Roll No
  worksheet.mergeCells(9, colIdx, 10, colIdx);
  worksheet.getCell(9, colIdx).value = 'Roll No';
  colIdx++;

  // Name
  worksheet.mergeCells(9, colIdx, 10, colIdx);
  worksheet.getCell(9, colIdx).value = 'Student Name';
  colIdx++;

  // Subjects
  targetSubjects.forEach((sub) => {
    const startCol = colIdx;
    if (is2021) {
      // 2 columns: Attd Hrs & Int Marks
      worksheet.mergeCells(9, startCol, 9, startCol + 1);
      worksheet.getCell(9, startCol).value = sub.code;
      worksheet.getCell(10, startCol).value = 'Attd Hrs';
      worksheet.getCell(10, startCol + 1).value = 'Int Marks';
      colIdx += 2;
    } else {
      // 3 columns: Attd Hrs, Attd %, Int Mark
      worksheet.mergeCells(9, startCol, 9, startCol + 2);
      worksheet.getCell(9, startCol).value = sub.code;
      worksheet.getCell(10, startCol).value = 'Attd Hrs';
      worksheet.getCell(10, startCol + 1).value = 'Attd %';
      worksheet.getCell(10, startCol + 2).value = 'Int Mark';
      colIdx += 3;
    }
  });

  // Overall Attd %
  worksheet.mergeCells(9, colIdx, 10, colIdx);
  worksheet.getCell(9, colIdx).value = 'Overall Attd %';

  // Apply styling to Header Rows 9 and 10
  for (let c = 1; c <= colIdx; c++) {
    const c9 = worksheet.getCell(9, c);
    const c10 = worksheet.getCell(10, c);
    c9.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    c9.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    c9.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(c9);

    c10.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFFFFF' } };
    c10.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
    c10.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(c10);
  }

  // Populate Student Rows
  let currentRow = 11;
  students.forEach((st, sIdx) => {
    const cleanName = String(st.name || '').replace(/ð[^\s]*/g, '').trim();
    const rowValues = [sIdx + 1, st.roll_no || st.rollNo || '-', cleanName];

    let totalAttendedHoursAll = 0;
    let totalPrescribedHoursAll = 0;

    targetSubjects.forEach((sub) => {
      const sess = allSessions.find(s => s.subject_id === sub.id && s.session_label === sessionLabel);
      let attHrs = 0;
      let markVal = '-';

      if (sess) {
        const attRec = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        if (attRec) {
          attHrs = parseInt(attRec.hours_attended || 0, 10);
        }
        const markRecs = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
        if (markRecs.length > 0) {
          let sum = 0;
          markRecs.forEach(m => sum += parseFloat(m.marks_obtained || 0));
          markVal = Math.round(sum);
        }
      }

      const subPrescribed = parseInt(sess?.total_hours || sub.total_hours || 30, 10);
      totalAttendedHoursAll += attHrs;
      totalPrescribedHoursAll += subPrescribed;

      if (is2021) {
        rowValues.push(attHrs, markVal);
      } else {
        const subPct = subPrescribed > 0 ? Math.min(100, Math.round((attHrs / subPrescribed) * 100)) : 0;
        rowValues.push(attHrs, `${subPct}%`, markVal);
      }
    });

    const overallPct = totalPrescribedHoursAll > 0
      ? Math.min(100, Math.round((totalAttendedHoursAll / totalPrescribedHoursAll) * 100))
      : 0;
    rowValues.push(`${overallPct}%`);

    const dataRow = worksheet.getRow(currentRow);
    dataRow.values = rowValues;
    dataRow.height = 20;

    const bg = (sIdx % 2 === 0) ? 'FFFFFF' : 'F8FAFC';
    dataRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      applyThinBorders(cell);

      if (colNumber === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    currentRow++;
  });

  currentRow += 2;
  // Signatures
  const sigRow = worksheet.getRow(currentRow);
  sigRow.values = ['', 'CLASS IN-CHARGE', '', '', 'HOD', '', '', '', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Set Column Widths
  worksheet.getColumn(1).width = 7;
  worksheet.getColumn(2).width = 17;
  worksheet.getColumn(3).width = 30;
  for (let c = 4; c <= colIdx; c++) {
    worksheet.getColumn(c).width = 14;
  }

  await triggerDownload(workbook, `${classObj?.name || 'Class'}_ExamCell_Legal_Statement.xlsx`);
};

export default {
  exportSubjectMarksExcel,
  exportLaboratoryMarksExcel,
  exportOverallMarksExcel
};


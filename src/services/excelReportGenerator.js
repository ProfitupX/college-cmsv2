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
 * Standard College Header for all Excel workbooks
 * Perfectly matches official Anna University / NSCET PDF layout:
 * - Wide College Header Banner image on top left (Rows 1-4)
 * - Format Information Box on top right (Rows 1-4)
 * - Banner Title Bar (Row 5)
 */
const drawExcelCollegeHeader = async ({
  workbook,
  worksheet,
  title,
  formatNo = 'NAC/TLP-07a.20',
  numCols = 10,
}) => {
  // Set row heights for rows 1 to 4 to host logo and format box cleanly
  worksheet.getRow(1).height = 20;
  worksheet.getRow(2).height = 20;
  worksheet.getRow(3).height = 20;
  worksheet.getRow(4).height = 20;

  // Format Info Box column position
  const startFormatCol = Math.max(numCols - 2, 4);

  // 1. Embed College Logo Banner
  const logoBase64 = await getImageBase64(logoImg);
  if (logoBase64) {
    const imageId = workbook.addImage({
      base64: logoBase64,
      extension: 'jpeg',
    });

    if (numCols > 12) {
      // Wide layout (ExamCell Legal Statement):
      // Center the logo across columns nicely with ample width
      const centerCol = Math.max(0.5, Math.floor((startFormatCol - 7) / 2));
      worksheet.addImage(imageId, {
        tl: { col: centerCol, row: 0.15 },
        ext: { width: 560, height: 100 }
      });
    } else {
      worksheet.addImage(imageId, {
        tl: { col: 0.1, row: 0.15 },
        ext: { width: 440, height: 95 }
      });
    }
  }

  // 2. Format Info Box on Top Right (Rows 1 to 4)
  const dateStr = new Date().toLocaleDateString('en-GB');

  const formatRows = [
    `Format No. : ${formatNo}`,
    'Rev.No     : 01',
    `Date       : ${dateStr}`,
    'Page       : 1 of 1'
  ];

  formatRows.forEach((text, i) => {
    const rowNum = 1 + i;
    worksheet.mergeCells(rowNum, startFormatCol, rowNum, numCols);
    const cell = worksheet.getCell(rowNum, startFormatCol);
    cell.value = text;
    cell.font = { name: 'Arial', size: 8.5, bold: false, color: { argb: '334155' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } };

    for (let c = startFormatCol; c <= numCols; c++) {
      applyThinBorders(worksheet.getCell(rowNum, c));
    }
  });

  // 3. Banner Title Bar (Row 5)
  worksheet.getRow(5).height = 24;
  worksheet.mergeCells(5, 1, 5, numCols);
  const titleCell = worksheet.getCell(5, 1);
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: '1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  for (let c = 1; c <= numCols; c++) {
    applyThinBorders(worksheet.getCell(5, c));
  }

  // 4. Spacer (Row 6)
  worksheet.getRow(6).height = 6;
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

  // Strictly assessment specific hours (from Admin Manage Subjects int1_hours/int2_hours or default 30)
  const tHours = isInternal2
    ? (parseInt(subject?.int2_hours || int2Hours, 10) || 30)
    : (parseInt(subject?.int1_hours || int1Hours, 10) || 30);

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

  const numCols = withInternal ? 6 : 8;

  // Draw Official College Header (Rows 1-5 + Spacer Row 6)
  await drawExcelCollegeHeader({
    workbook,
    worksheet,
    title: `${modeLabel} — SUBJECT MARKS LIST (${typeLabel})`,
    formatNo: 'NAC/TLP-07a.20',
    numCols
  });

  // Metadata Block (Rows 7-9) with merged cells for clean alignment & zero truncation
  const metaRows = [
    {
      label1: 'Year / Semester:',
      val1: `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`,
      label2: 'Department:',
      val2: subject?.department || classObj?.department || 'Information Technology'
    },
    {
      label1: 'Faculty Name:',
      val1: staffName,
      label2: 'Academic Year:',
      val2: '2026 - 2027'
    },
    {
      label1: 'Subject Code / Name:',
      val1: `${subject?.code || ''} — ${subject?.name || ''}`,
      label2: 'Total Prescribed Hrs:',
      val2: `${tHours} Hours`
    }
  ];

  metaRows.forEach((item, i) => {
    const rowNum = 7 + i;
    worksheet.getRow(rowNum).height = 20;

    worksheet.mergeCells(rowNum, 1, rowNum, 2);
    const l1 = worksheet.getCell(rowNum, 1);
    l1.value = item.label1;
    l1.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
    l1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    l1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    worksheet.getCell(rowNum, 3).value = item.val1;
    worksheet.getCell(rowNum, 3).font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
    worksheet.getCell(rowNum, 3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
    worksheet.getCell(rowNum, 3).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    worksheet.mergeCells(rowNum, 4, rowNum, 5);
    const l2 = worksheet.getCell(rowNum, 4);
    l2.value = item.label2;
    l2.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
    l2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    l2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    worksheet.getCell(rowNum, 6).value = item.val2;
    worksheet.getCell(rowNum, 6).font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
    worksheet.getCell(rowNum, 6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
    worksheet.getCell(rowNum, 6).alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    for (let c = 1; c <= 6; c++) {
      applyThinBorders(worksheet.getCell(rowNum, c));
    }
  });

  worksheet.getRow(10).height = 8; // spacer

  // Table Column Headers (Row 11)
  let headers = [];
  if (withInternal) {
    headers = [
      'S.No', 'Roll No', 'Student Name',
      'Attd Mark (Max: 5)', 'Activities / Assignment Marks (Max: 95)', 'Total Internal Marks (Max: 100)'
    ];
  } else {
    headers = [
      'S.No', 'Roll No', 'Student Name', 'Actual Attd (Hrs)', `Attended (/ ${tHours})`, 'Attd %',
      'Written Exam Mark (/ 100)', 'Result (Pass / Fail)'
    ];
  }

  const headerRow = worksheet.getRow(11);
  headerRow.values = headers;
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(cell);
  });

  // Populate Student Rows (Starting Row 12)
  let currentRow = 12;
  students.forEach((student, idx) => {
    let convertedTotal = 0;
    (components || []).forEach(c => {
      const val = parseFloat(marksData[student.id]?.[c.uid || c.id]) || 0;
      const conducted = parseFloat(c.conductedMax || c.conducted_max) || 100;
      convertedTotal += Math.min(val, conducted);
    });
    convertedTotal = Math.round(convertedTotal);

    const rawHours = parseInt(attendanceData[student.id] || 0, 10);
    const pct = tHours > 0 ? Math.min(100, Math.round((rawHours / tHours) * 100)) : 0;
    const computedAttdMark = getAttendanceMark(pct);
    const attendanceMark = (attendanceMarks && attendanceMarks[student.id] !== undefined && parseFloat(attendanceMarks[student.id]) > 0)
      ? parseFloat(attendanceMarks[student.id])
      : computedAttdMark;

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
      rowValues = [
        idx + 1,
        student.roll_no || student.rollNo || '-',
        cleanName,
        attendanceMark,
        convertedTotal,
        totalInternal
      ];
    } else {
      const isPass = !isExamAbsent && parseInt(examMarkStr, 10) >= 50;
      const resultStr = isExamAbsent ? 'AB' : (isPass ? 'PASS' : 'FAIL');
      rowValues = [
        idx + 1,
        student.roll_no || student.rollNo || '-',
        cleanName,
        rawHours,
        `${cappedHours} / ${tHours}`,
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
    criteriaRow.values = ['', '', 'MAX MARKS', 5, 95, 100];
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
  sigRow.values = ['', 'SUBJECT FACULTY', '', 'CLASS IN-CHARGE', 'HOD', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Column Widths
  if (withInternal) {
    worksheet.columns = [
      { width: 8 },   // S.No
      { width: 18 },  // Roll No
      { width: 34 },  // Student Name
      { width: 18 },  // Attd Mark (Max: 5)
      { width: 26 },  // Activities (Max: 95)
      { width: 24 }   // Total Internal (Max: 100)
    ];
  } else {
    worksheet.columns = [
      { width: 8 },   // S.No
      { width: 18 },  // Roll No
      { width: 34 },  // Student Name
      { width: 16 },  // Actual Attd
      { width: 16 },  // Attended
      { width: 12 },  // Attd %
      { width: 22 },  // Written Exam
      { width: 18 }   // Result
    ];
  }

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
  const numCols = 6;

  // Draw Official College Header
  await drawExcelCollegeHeader({
    workbook,
    worksheet,
    title: `LABORATORY / PRACTICAL MARKS STATEMENT — ${assessmentMode === 'internal2' ? 'INTERNAL 2' : 'INTERNAL 1'}`,
    formatNo: 'NAC/TLP-LAB.01',
    numCols
  });

  // Metadata Block (Rows 7-9)
  const metaData = [
    ['Year / Semester:', `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, '', 'Department:', subject?.department || classObj?.department || 'Information Technology'],
    ['Staff In-Charge:', staffName, '', 'Academic Year:', '2026 - 2027'],
    ['Subject Code / Name:', `${subject?.code || ''} — ${subject?.name || ''}`, '', 'Prescribed Lab Hrs:', `${prescribedLabHours} Hours`]
  ];

  metaData.forEach((row, i) => {
    const r = worksheet.getRow(7 + i);
    r.values = row;
    r.font = { name: 'Arial', size: 9 };
    r.getCell(1).font = { bold: true };
    r.getCell(4).font = { bold: true };
    r.height = 18;
  });

  worksheet.getRow(10).height = 8; // spacer

  // Table Headers (Row 11)
  const headerRow = worksheet.getRow(11);
  headerRow.values = ['S.No', 'Roll No', 'Student Name', `Lab Attended Hours (/ ${prescribedLabHours})`, 'Lab Marks (/ 100)', 'Result (Pass / Fail)'];
  headerRow.height = 26;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(cell);
  });

  // Rows (Starting Row 12)
  let currentRow = 12;
  students.forEach((student, idx) => {
    const rawAttd = parseInt(labData[student.id]?.labAttendance || attendanceData[student.id] || 0, 10);
    const rawMark = parseFloat(labData[student.id]?.labMark || 0);
    const isAbsent = isNaN(rawMark) || labData[student.id]?.labMark === null || labData[student.id]?.labMark === undefined || labData[student.id]?.labMark === '' || labData[student.id]?.labMark === 'AB';
    const markStr = isAbsent ? 'AB' : Math.round(rawMark);
    const isPass = !isAbsent && markStr >= 50;
    const cleanName = String(student.name || '').replace(/ð[^\s]*/g, '').trim();

    const rowValues = [
      idx + 1,
      student.roll_no || student.rollNo || '-',
      cleanName,
      `${rawAttd} / ${prescribedLabHours}`,
      markStr,
      isAbsent ? 'AB' : (isPass ? 'PASS' : 'FAIL')
    ];

    const dataRow = worksheet.getRow(currentRow);
    dataRow.values = rowValues;
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
  const colsPerSub = is2021 ? 2 : 3;
  const totalColumns = 3 + (targetSubjects.length * colsPerSub) + 1;

  // Draw Official College Header
  await drawExcelCollegeHeader({
    workbook,
    worksheet,
    title: `EXAMCELL LEGAL STATEMENT — ${sessionLabel === 'internal2' ? 'INTERNAL ASSESSMENT 2' : 'INTERNAL ASSESSMENT 1'} (${withInternal ? 'WITH ASSIGNMENT MARKS' : 'WITHOUT ASSIGNMENT MARKS'})`,
    formatNo: 'NAC/TLP-07a.20',
    numCols: totalColumns
  });

  // Metadata Block (Rows 7-9) with properly merged cells so text is never cut off
  const metaRows = [
    {
      label1: 'Class / Year / Sem:',
      val1: `${classObj?.name || 'Class'} (${classObj?.year_label || 'II'} / Sem ${classObj?.semester || '4'})`,
      label2: 'Department:',
      val2: classObj?.department || 'Information Technology'
    },
    {
      label1: 'Regulation:',
      val1: is2021 ? '2021 Regulation' : '2025 Regulation',
      label2: 'Academic Year:',
      val2: '2026 - 2027'
    },
    {
      label1: 'Total Subjects:',
      val1: `${targetSubjects.length} Subjects`,
      label2: 'Generated Date:',
      val2: new Date().toLocaleDateString('en-GB')
    }
  ];

  metaRows.forEach((item, idx) => {
    const rowNum = 7 + idx;
    worksheet.getRow(rowNum).height = 20;

    // Field 1: Label (Cols 1 to 3) + Value (Cols 4 to 8)
    worksheet.mergeCells(rowNum, 1, rowNum, 3);
    const l1 = worksheet.getCell(rowNum, 1);
    l1.value = item.label1;
    l1.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
    l1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    l1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    worksheet.mergeCells(rowNum, 4, rowNum, 8);
    const v1 = worksheet.getCell(rowNum, 4);
    v1.value = item.val1;
    v1.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
    v1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
    v1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    // Field 2: Label (Cols 9 to 11) + Value (Cols 12 to 16)
    worksheet.mergeCells(rowNum, 9, rowNum, 11);
    const l2 = worksheet.getCell(rowNum, 9);
    l2.value = item.label2;
    l2.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
    l2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    l2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    worksheet.mergeCells(rowNum, 12, rowNum, 16);
    const v2 = worksheet.getCell(rowNum, 12);
    v2.value = item.val2;
    v2.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
    v2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
    v2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

    for (let c = 1; c <= 16; c++) {
      applyThinBorders(worksheet.getCell(rowNum, c));
    }
  });

  worksheet.getRow(10).height = 8; // spacer

  // Header Rows (Row 11: Top Subject Codes, Row 12: Subcolumns)
  const row11 = worksheet.getRow(11);
  const row12 = worksheet.getRow(12);
  row11.height = 24;
  row12.height = 24;

  let colIdx = 1;
  // S.No
  worksheet.mergeCells(11, colIdx, 12, colIdx);
  worksheet.getCell(11, colIdx).value = 'S.No';
  colIdx++;

  // Roll No
  worksheet.mergeCells(11, colIdx, 12, colIdx);
  worksheet.getCell(11, colIdx).value = 'Roll No';
  colIdx++;

  // Name
  worksheet.mergeCells(11, colIdx, 12, colIdx);
  worksheet.getCell(11, colIdx).value = 'Student Name';
  colIdx++;

  // Subjects
  targetSubjects.forEach((sub) => {
    const startCol = colIdx;
    if (is2021) {
      worksheet.mergeCells(11, startCol, 11, startCol + 1);
      worksheet.getCell(11, startCol).value = sub.code;
      worksheet.getCell(12, startCol).value = 'Attd Hrs';
      worksheet.getCell(12, startCol + 1).value = 'Int Marks';
      colIdx += 2;
    } else {
      worksheet.mergeCells(11, startCol, 11, startCol + 2);
      worksheet.getCell(11, startCol).value = sub.code;
      worksheet.getCell(12, startCol).value = 'Attd Hrs';
      worksheet.getCell(12, startCol + 1).value = 'Attd %';
      worksheet.getCell(12, startCol + 2).value = 'Int Mark';
      colIdx += 3;
    }
  });

  // Overall Attd %
  worksheet.mergeCells(11, colIdx, 12, colIdx);
  worksheet.getCell(11, colIdx).value = 'Overall Attd %';

  // Apply styling to Header Rows 11 and 12
  for (let c = 1; c <= colIdx; c++) {
    const c11 = worksheet.getCell(11, c);
    const c12 = worksheet.getCell(12, c);
    c11.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    c11.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    c11.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(c11);

    c12.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: 'FFFFFF' } };
    c12.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E40AF' } };
    c12.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(c12);
  }

  // Populate Student Rows (Starting Row 13)
  let currentRow = 13;
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

      const subPrescribed = parseInt(sess?.total_hours || (sessionLabel === 'internal2' ? sub.int2_hours : sub.int1_hours) || 30, 10);
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

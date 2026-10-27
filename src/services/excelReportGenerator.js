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
  setTimeout(() => {
    try {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      URL.revokeObjectURL(link.href);
    } catch (e) {
      // ignore
    }
  }, 1500);
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
  worksheet.getRow(1).height = 23;
  worksheet.getRow(2).height = 23;
  worksheet.getRow(3).height = 23;
  worksheet.getRow(4).height = 23;

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
      const centerCol = Math.max(0.5, Math.floor((startFormatCol - 7) / 2));
      worksheet.addImage(imageId, {
        tl: { col: centerCol, row: 0.1 },
        ext: { width: 500, height: 82 }
      });
    } else {
      worksheet.addImage(imageId, {
        tl: { col: 0.1, row: 0.1 },
        ext: { width: 380, height: 80 }
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
  const is2021 = classObj?.regulation === '2021' || subject?.regulation === '2021' || (assessmentMode && String(assessmentMode).includes('2021'));
  const typeLabel = withInternal ? 'WITH ASSIGNMENT MARKS' : 'WITHOUT ASSIGNMENT MARKS';
  const staffName = staff?.name || subject?.faculty_name || subject?.staff_name || 'Faculty Staff';

  const numCols = is2021 ? (withInternal ? 8 : 7) : 6;

  // Draw Official College Header (Rows 1-5 + Spacer Row 6)
  await drawExcelCollegeHeader({
    workbook,
    worksheet,
    title: is2021 ? `${modeLabel} — SUBJECT MARKS LIST (${typeLabel})` : `${modeLabel} — SUBJECT MARKS LIST`,
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

    if (!is2021) {
      // 6 columns total for 2025: col 1 = label1, cols 2-3 = val1, col 4 = label2, cols 5-6 = val2
      const l1 = worksheet.getCell(rowNum, 1);
      l1.value = item.label1;
      l1.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
      l1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      l1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 2, rowNum, 3);
      const v1 = worksheet.getCell(rowNum, 2);
      v1.value = item.val1;
      v1.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
      v1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
      v1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      const l2 = worksheet.getCell(rowNum, 4);
      l2.value = item.label2;
      l2.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
      l2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      l2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 5, rowNum, 6);
      const v2 = worksheet.getCell(rowNum, 5);
      v2.value = item.val2;
      v2.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
      v2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
      v2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      for (let c = 1; c <= 6; c++) {
        applyThinBorders(worksheet.getCell(rowNum, c));
      }
    } else if (withInternal) {
      // 8 columns total: col 1-2 = label1, cols 3-4 = val1, col 5-6 = label2, cols 7-8 = val2
      worksheet.mergeCells(rowNum, 1, rowNum, 2);
      const l1 = worksheet.getCell(rowNum, 1);
      l1.value = item.label1;
      l1.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
      l1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      l1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 3, rowNum, 4);
      const v1 = worksheet.getCell(rowNum, 3);
      v1.value = item.val1;
      v1.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
      v1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
      v1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 5, rowNum, 6);
      const l2 = worksheet.getCell(rowNum, 5);
      l2.value = item.label2;
      l2.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
      l2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      l2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 7, rowNum, 8);
      const v2 = worksheet.getCell(rowNum, 7);
      v2.value = item.val2;
      v2.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
      v2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
      v2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      for (let c = 1; c <= 8; c++) {
        applyThinBorders(worksheet.getCell(rowNum, c));
      }
    } else {
      // 7 columns total: col 1 = label1, cols 2-3 = val1, cols 4-5 = label2, cols 6-7 = val2
      const l1 = worksheet.getCell(rowNum, 1);
      l1.value = item.label1;
      l1.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
      l1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      l1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 2, rowNum, 3);
      const v1 = worksheet.getCell(rowNum, 2);
      v1.value = item.val1;
      v1.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
      v1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
      v1.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 4, rowNum, 5);
      const l2 = worksheet.getCell(rowNum, 4);
      l2.value = item.label2;
      l2.font = { name: 'Arial', size: 9, bold: true, color: { argb: '1E293B' } };
      l2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
      l2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      worksheet.mergeCells(rowNum, 6, rowNum, 7);
      const v2 = worksheet.getCell(rowNum, 6);
      v2.value = item.val2;
      v2.font = { name: 'Arial', size: 9, bold: false, color: { argb: '0F172A' } };
      v2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } };
      v2.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };

      for (let c = 1; c <= 7; c++) {
        applyThinBorders(worksheet.getCell(rowNum, c));
      }
    }
  });

  worksheet.getRow(10).height = 8; // spacer

  // Table Column Headers (Row 11)
  let headers = [];
  if (!is2021) {
    // 2025 Autonomous Regulation default headers
    headers = [
      'S.No', 'Roll No', 'Student Name',
      'Attd Mark (Max: 5)', 'Activities / Assignment Marks (Max: 95)', 'Total Internal Marks (Max: 100)'
    ];
  } else if (withInternal) {
    headers = [
      'S.No', 'Roll No', 'Student Name', 'Attended Class Hours',
      'Assignment Mark', 'Internal Written Exam Mark (/ 100)',
      'Total Internal Marks (/ 100)', 'Result (Pass / Fail)'
    ];
  } else {
    headers = [
      'S.No', 'Roll No', 'Student Name', 'Attended Class Hours',
      'Activities Mark', 'Internal Written Test Mark (/ 100)', 'Result (Pass / Fail)'
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

    const examMark = internalExamData ? internalExamData[student.id] : undefined;
    const numExam = parseFloat(examMark);
    const isExamAbsent = isNaN(numExam) || examMark === null || examMark === undefined || examMark === '' || examMark === 'AB';
    const examMarkStr = isExamAbsent ? 'AB' : Math.round(numExam);

    let totalInternal;
    if (is2021) {
      const ciaMax = hasLab ? 50 : 40;
      const examConvertedMax = hasLab ? 50 : 60;
      const ciaTotal2021 = Math.min(convertedTotal, ciaMax);
      const examConverted2021 = isExamAbsent ? 0 : Math.round((numExam / 100) * examConvertedMax);
      totalInternal = Math.min(100, ciaTotal2021 + examConverted2021);
    } else {
      totalInternal = Math.min(100, convertedTotal + attendanceMark);
    }

    const cleanName = String(student.name || '').replace(/ð[^\s]*/g, '').trim();

    let rowValues = [];
    if (!is2021) {
      // 2025 default statement
      rowValues = [
        idx + 1,
        student.roll_no || student.rollNo || '-',
        cleanName,
        attendanceMark,
        convertedTotal,
        totalInternal
      ];
    } else if (withInternal) {
      const isPass = !isExamAbsent && totalInternal >= 50;
      const resultStr = isExamAbsent ? 'AB' : (isPass ? 'PASS' : 'FAIL');
      rowValues = [
        idx + 1,
        student.roll_no || student.rollNo || '-',
        cleanName,
        `${rawHours} / ${tHours} Hrs`,
        convertedTotal,
        examMarkStr,
        totalInternal,
        resultStr
      ];
    } else {
      const isPass = !isExamAbsent && parseInt(examMarkStr, 10) >= 50;
      const resultStr = isExamAbsent ? 'AB' : (isPass ? 'PASS' : 'FAIL');
      rowValues = [
        idx + 1,
        student.roll_no || student.rollNo || '-',
        cleanName,
        `${rawHours} / ${tHours} Hrs`,
        convertedTotal,
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

      // Highlight Pass/Fail for 2021
      if (is2021) {
        const resultCol = withInternal ? 8 : 7;
        if (colNumber === resultCol) {
          if (cell.value === 'PASS') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '166534' } };
          } else if (cell.value === 'FAIL') {
            cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '991B1B' } };
          }
        }
      }
    });

    currentRow++;
  });

  // Criteria Row
  const criteriaRow = worksheet.getRow(currentRow);
  if (!is2021) {
    criteriaRow.values = ['', '', 'MAX MARKS', 5, 95, 100];
  } else if (withInternal) {
    criteriaRow.values = ['', '', 'MAX MARKS', `${tHours} Hrs`, 95, 100, 100, '>= 50% PASS'];
  } else {
    criteriaRow.values = ['', '', 'MAX MARKS / CRITERIA', `${tHours} Hrs`, 100, 100, '>= 50% PASS'];
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
  sigRow.values = is2021 && withInternal
    ? ['', 'SUBJECT FACULTY', '', 'CLASS IN-CHARGE', '', 'HOD', '', 'PRINCIPAL']
    : ['', 'SUBJECT FACULTY', '', 'CLASS IN-CHARGE', '', 'HOD', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Print & Page Setup (Ensures table fits A4 width perfectly without clipping)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: is2021 ? 'landscape' : 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45 },
    printTitlesRow: '11:11'
  };

  // Column Widths with ample space
  if (!is2021) {
    worksheet.columns = [
      { width: 7 },   // S.No
      { width: 18 },  // Roll No
      { width: 34 },  // Student Name
      { width: 18 },  // Attd Mark (Max: 5)
      { width: 34 },  // Activities / Assignment Marks (Max: 95)
      { width: 26 }   // Total Internal (Max: 100)
    ];
  } else if (withInternal) {
    worksheet.columns = [
      { width: 7 },   // S.No
      { width: 18 },  // Roll No
      { width: 34 },  // Student Name
      { width: 22 },  // Attended Class Hours
      { width: 18 },  // Assignment Mark
      { width: 28 },  // Internal Written Exam Mark (/ 100)
      { width: 26 },  // Total Internal Marks (/ 100)
      { width: 18 }   // Result
    ];
  } else {
    worksheet.columns = [
      { width: 7 },   // S.No
      { width: 18 },  // Roll No
      { width: 34 },  // Student Name
      { width: 22 },  // Attended Class Hours
      { width: 18 },  // Activities Mark
      { width: 28 },  // Internal Written Test Mark (/ 100)
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
    let attendedHours = 0;
    if (labData[student.id]?.labAttendance !== undefined && labData[student.id]?.labAttendance !== null && labData[student.id]?.labAttendance !== '') {
      attendedHours = parseInt(labData[student.id].labAttendance, 10);
    } else if (attendanceData[student.id] !== undefined && attendanceData[student.id] !== null && attendanceData[student.id] !== '') {
      attendedHours = parseInt(attendanceData[student.id], 10);
    }
    const cleanHours = Math.min(attendedHours, prescribedLabHours);

    let rawLabMark = null;
    if (labData[student.id]?.labMark !== undefined && labData[student.id]?.labMark !== null && labData[student.id]?.labMark !== '') {
      rawLabMark = labData[student.id].labMark;
    } else if (internalExamData[student.id] !== undefined && internalExamData[student.id] !== null && internalExamData[student.id] !== '') {
      rawLabMark = internalExamData[student.id];
    }

    const numMark = parseFloat(rawLabMark);
    const isAbsent = isNaN(numMark) || rawLabMark === null || rawLabMark === '' || rawLabMark === 'AB';
    const markStr = isAbsent ? 'AB' : Math.round(numMark);
    const isPass = !isAbsent && markStr >= 50;
    const cleanName = String(student.name || '').replace(/ð[^\s]*/g, '').trim();

    const rowValues = [
      idx + 1,
      student.roll_no || student.rollNo || '-',
      cleanName,
      `${cleanHours} / ${prescribedLabHours}`,
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

  // Print & Page Setup (Ensures table fits A4 width perfectly without clipping)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45 },
    printTitlesRow: '11:11'
  };

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
          attHrs = parseInt(
            attRec.actual_taken_hours !== undefined && attRec.actual_taken_hours !== null && attRec.actual_taken_hours !== ''
              ? attRec.actual_taken_hours
              : (attRec.hours_attended || attRec.attendance_days || attRec.lab_attendance || 0),
            10
          );
        }

        // Marks calculation: assignment marks + internal written exam mark
        let sumAssignment = 0;
        const markRecs = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
        if (markRecs.length > 0) {
          markRecs.forEach(m => sumAssignment += parseFloat(m.marks_obtained || 0));
        }

        let examMark = null;
        if (attRec) {
          const isLab = ['Practical', 'Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(sub.type || '');
          if (isLab && attRec.lab_mark !== null && attRec.lab_mark !== undefined && attRec.lab_mark !== '') {
            examMark = parseFloat(attRec.lab_mark);
          } else if (attRec.internal_exam_mark !== null && attRec.internal_exam_mark !== undefined && attRec.internal_exam_mark !== '') {
            examMark = parseFloat(attRec.internal_exam_mark);
          }
        }

        if (is2021) {
          const isLab = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(sub.type || '');
          const ciaMax = isLab ? 50 : 40;
          const examMax = isLab ? 50 : 60;
          const ciaTotal = Math.min(Math.round(sumAssignment), ciaMax);
          const examConverted = (examMark !== null && !isNaN(examMark)) ? Math.round((examMark / 100) * examMax) : 0;
          if (examMark === null && markRecs.length === 0) {
            markVal = '-';
          } else {
            markVal = Math.min(100, ciaTotal + examConverted);
          }
        } else {
          if (examMark !== null && !isNaN(examMark)) {
            markVal = Math.round(examMark);
          } else if (markRecs.length > 0) {
            markVal = Math.round(sumAssignment);
          } else {
            markVal = '-';
          }
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

  // Print & Page Setup (Landscape A4, fit to width)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4 },
    printTitlesRow: '11:12'
  };

  // Set Column Widths
  worksheet.getColumn(1).width = 7;
  worksheet.getColumn(2).width = 17;
  worksheet.getColumn(3).width = 30;
  for (let c = 4; c <= colIdx; c++) {
    worksheet.getColumn(c).width = 14;
  }

  await triggerDownload(workbook, `${classObj?.name || 'Class'}_ExamCell_Legal_Statement.xlsx`);
};

/**
 * 4. Export Subject Test Analysis Report (NAC/TLP-07a.21)
 */
export const exportSubjectAnalysisExcel = async ({
  subject,
  classObj,
  staff,
  session,
  remedialAction = '',
  students = [],
  marksData = {},
  allMarks = [],
  components = [],
  attendanceData = {},
  internalExamData = {},
  labData = {},
  assessmentMode = 'internal1',
  declarationData = {},
  user
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Subject Analysis');

  const staffName = staff?.name || subject?.faculty_name || subject?.staff_name || user?.name || 'Faculty Staff';
  const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
  const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type || '');
  const ciaMax = isLabType ? 50 : 40;
  const examConvertedMax = isLabType ? 50 : 60;
  const analysisPrescribedHrs = (assessmentMode === 'internal2')
    ? (parseInt(subject?.int2_hours, 10) || 30)
    : (parseInt(subject?.int1_hours, 10) || 30);

  const gradeCounts = { U: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
  let appeared = 0;
  let passed = 0;
  let failed = 0;
  let absent = 0;
  let maxMark = 0;
  let minMark = 100;
  let totalScore = 0;

  const studentRows = students.map((st, idx) => {
    let mark = 0;
    let isAbsent = false;

    if (is2021) {
      let rawCIA = 0;
      if (components && (marksData || allMarks)) {
        const isArray = Array.isArray(marksData) || Array.isArray(allMarks);
        const dataArr = Array.isArray(marksData) ? marksData : (Array.isArray(allMarks) ? allMarks : []);
        components.forEach(comp => {
          let val = 0;
          if (isArray) {
            const markObj = dataArr.find(m => m.component_id === comp.id && m.student_id === st.id);
            val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
          } else {
            val = (marksData[st.id] && marksData[st.id][comp.uid || comp.id]) ? parseFloat(marksData[st.id][comp.uid || comp.id]) : 0;
          }
          const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || parseFloat(comp.conductedMax) || 100;
          rawCIA += Math.min(val, conducted);
        });
      }
      const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);
      const examRaw = parseFloat(internalExamData[st.id]) || 0;
      const examConverted = Math.round((examRaw / 100) * examConvertedMax);
      const labExamRaw = labData[st.id]?.labMark ? parseFloat(labData[st.id].labMark) : 0;
      const labExamConverted = Math.round((labExamRaw / 100) * 50);

      if (isLabType && assessmentMode === 'internal2') {
        mark = Math.min(ciaTotal + labExamConverted, 100);
      } else {
        mark = Math.min(ciaTotal + examConverted, 100);
      }

      const rawVal = internalExamData[st.id];
      if ((rawVal === '' || rawVal === undefined || rawVal === null) && (!isLabType || assessmentMode !== 'internal2')) {
        isAbsent = true;
      }
    } else {
      const rawVal = internalExamData[st.id];
      if (rawVal === '' || rawVal === undefined || rawVal === null) {
        isAbsent = true;
      } else {
        mark = parseFloat(rawVal) || 0;
      }
    }

    if (isAbsent) {
      absent++;
      return {
        sNo: idx + 1,
        rollNo: st.roll_no || st.rollNo || '-',
        name: String(st.name || '').replace(/ð[^\s]*/g, '').trim(),
        markStr: 'AB',
        result: 'AB'
      };
    }

    appeared++;
    totalScore += mark;
    if (mark > maxMark) maxMark = mark;
    if (mark < minMark) minMark = mark;

    const passMarkThreshold = (isLabType || subject?.type?.toLowerCase().includes('lab') || subject?.type?.toLowerCase().includes('practical')) ? 50 : 60;
    const isPass = mark >= passMarkThreshold;
    if (isPass) passed++;
    else failed++;

    if (mark < 50) gradeCounts.U++;
    else if (mark <= 55) gradeCounts.E++;
    else if (mark <= 59) gradeCounts.D++;
    else if (mark <= 69) gradeCounts.C++;
    else if (mark <= 79) gradeCounts.B++;
    else if (mark <= 89) gradeCounts.A++;
    else gradeCounts.S++;

    return {
      sNo: idx + 1,
      rollNo: st.roll_no || st.rollNo || '-',
      name: String(st.name || '').replace(/ð[^\s]*/g, '').trim(),
      markStr: Math.round(mark),
      result: isPass ? 'PASS' : 'FAIL'
    };
  });

  if (appeared === 0) minMark = 0;
  const passPct = appeared > 0 ? ((passed / appeared) * 100).toFixed(1) : '100.0';
  const avgMark = appeared > 0 ? (totalScore / appeared).toFixed(1) : '0.0';

  // Draw Official College Header
  await drawExcelCollegeHeader({
    workbook,
    worksheet,
    title: `TEST ANALYSIS REPORT (SUBJECT WISE) — ${assessmentMode === 'internal1' ? 'INTERNAL TEST 1' : 'INTERNAL TEST 2'}`,
    formatNo: 'NAC/TLP-07a.21',
    numCols: 8
  });

  // Metadata Block
  const meta = [
    ['Year / Semester:', `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, '', 'Department:', subject?.department || classObj?.department || 'Information Technology'],
    ['Staff In-Charge:', staffName, '', 'Academic Year:', '2026 - 2027'],
    ['Subject Code / Name:', `${subject?.code || ''} — ${subject?.name || ''}`, '', 'Prescribed Hrs:', `${analysisPrescribedHrs} Hours`],
    ['Internal Assessment:', assessmentMode === 'internal1' ? 'Internal Test 1 with Assignment' : 'Internal Test 2 with Assignment', '', 'Student Strength:', `${students.length} Students`]
  ];

  meta.forEach((row, i) => {
    const r = worksheet.getRow(7 + i);
    r.values = row;
    r.font = { name: 'Arial', size: 9 };
    r.getCell(1).font = { bold: true };
    r.getCell(4).font = { bold: true };
    r.height = 18;
  });

  worksheet.getRow(11).height = 8; // spacer

  // Grade Distribution Table (Rows 12-14)
  const gTitle = worksheet.getRow(12);
  gTitle.values = ['1. Grade & Performance Analysis:'];
  gTitle.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '1E3A8A' } };

  const gHead = worksheet.getRow(13);
  gHead.values = ['Description', '0-49 (U)', '50-55 (E)', '56-59 (D)', '60-69 (C)', '70-79 (B)', '80-89 (A)', '90-100 (S)'];
  gHead.height = 22;
  gHead.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(cell);
  });

  const gRow1 = worksheet.getRow(14);
  gRow1.values = ['No. of Students', gradeCounts.U, gradeCounts.E, gradeCounts.D, gradeCounts.C, gradeCounts.B, gradeCounts.A, gradeCounts.S];
  gRow1.height = 20;
  gRow1.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(cell);
  });

  const gRow2 = worksheet.getRow(15);
  gRow2.values = [
    '% of Students',
    appeared > 0 ? `${((gradeCounts.U / appeared) * 100).toFixed(0)}%` : '0%',
    appeared > 0 ? `${((gradeCounts.E / appeared) * 100).toFixed(0)}%` : '0%',
    appeared > 0 ? `${((gradeCounts.D / appeared) * 100).toFixed(0)}%` : '0%',
    appeared > 0 ? `${((gradeCounts.C / appeared) * 100).toFixed(0)}%` : '0%',
    appeared > 0 ? `${((gradeCounts.B / appeared) * 100).toFixed(0)}%` : '0%',
    appeared > 0 ? `${((gradeCounts.A / appeared) * 100).toFixed(0)}%` : '0%',
    appeared > 0 ? `${((gradeCounts.S / appeared) * 100).toFixed(0)}%` : '0%'
  ];
  gRow2.height = 20;
  gRow2.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9 };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(cell);
  });

  // KPI Summary Row (Row 17)
  const kpiRow = worksheet.getRow(17);
  kpiRow.values = [
    `Total Strength: ${students.length}`,
    `Appeared: ${appeared}`,
    `Passed: ${passed}`,
    `Failed: ${failed}`,
    `Pass %: ${passPct}%`,
    `Average: ${avgMark}`,
    `Highest: ${maxMark}`,
    `Lowest: ${minMark}`
  ];
  kpiRow.height = 22;
  kpiRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 8.5, bold: true, color: { argb: '1E3A8A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(cell);
  });

  worksheet.getRow(18).height = 10; // spacer

  // Student Marks Table
  const sTitle = worksheet.getRow(19);
  sTitle.values = ['2. Student Mark List:'];
  sTitle.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '1E3A8A' } };

  const sHead = worksheet.getRow(20);
  sHead.values = ['S.No', 'Roll No', 'Student Name', 'Marks Obtained (/ 100)', 'Result', '', '', ''];
  sHead.height = 24;
  sHead.eachCell((cell, col) => {
    if (col <= 5) {
      cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      applyThinBorders(cell);
    }
  });

  let curRow = 21;
  studentRows.forEach((r, idx) => {
    const row = worksheet.getRow(curRow);
    row.values = [r.sNo, r.rollNo, r.name, r.markStr, r.result];
    row.height = 20;

    const bg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
    for (let c = 1; c <= 5; c++) {
      const cell = row.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      applyThinBorders(cell);

      if (c === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      if (c === 5) {
        if (cell.value === 'PASS') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '166534' } };
        } else if (cell.value === 'FAIL') {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '991B1B' } };
        } else {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '64748B' } };
        }
      }
    }
    curRow++;
  });

  curRow += 2;
  // Signatures
  const sigRow = worksheet.getRow(curRow);
  sigRow.values = ['', 'FACULTY IN-CHARGE', '', 'HOD', '', '', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Print & Page Setup (Ensures table fits A4 width cleanly)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'portrait',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45 },
    printTitlesRow: '20:20'
  };

  worksheet.columns = [
    { width: 7 },
    { width: 18 },
    { width: 34 },
    { width: 22 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 }
  ];

  await triggerDownload(workbook, `${subject?.code || 'SUB'}_Test_Analysis_Report.xlsx`);
};

/**
 * 5. Export Consolidated Mark Statement (NAC/TLP-07a.20)
 */
export const exportConsolidatedMarksExcel = async ({
  classObj,
  sessionLabel = 'internal1',
  subjects = [],
  students = [],
  allSessions = [],
  allAttendance = [],
  allMarks = [],
  allComponents = [],
  selectedSubjectIds,
  inchargeNameParam = '',
  user
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Consolidated Marks');

  let filteredSubjects = subjects.filter(s => s.code !== 'LIB' && s.name.toUpperCase() !== 'LIBRARY');
  if (selectedSubjectIds && selectedSubjectIds.length > 0) {
    filteredSubjects = filteredSubjects.filter(s => selectedSubjectIds.includes(s.id));
  }

  const numCols = 3 + filteredSubjects.length + 3;

  await drawExcelCollegeHeader({
    workbook,
    worksheet,
    title: `CONSOLIDATED MARK STATEMENT — ${sessionLabel === 'internal1' ? 'INTERNAL TEST 1' : 'INTERNAL TEST 2'}`,
    formatNo: 'NAC/TLP-07a.20',
    numCols
  });

  // Metadata Block
  const meta = [
    ['Year / Semester:', `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, '', 'Department:', classObj?.department || 'Information Technology'],
    ['Class In-Charge:', inchargeNameParam || user?.name || 'Class In-charge', '', 'Academic Year:', '2026 - 2027'],
    ['Internal Assessment:', sessionLabel === 'internal1' ? 'Internal Test 1 with Assignment' : 'Internal Test 2 with Assignment', '', 'Student Strength:', `${students.length} Students`]
  ];

  meta.forEach((row, i) => {
    const r = worksheet.getRow(7 + i);
    r.values = row;
    r.font = { name: 'Arial', size: 9 };
    r.getCell(1).font = { bold: true };
    r.getCell(4).font = { bold: true };
    r.height = 18;
  });

  worksheet.getRow(10).height = 8; // spacer

  // Table Header (Row 11)
  const headCols = ['S.No', 'Roll No', 'Student Name', ...filteredSubjects.map(s => s.code), 'Failed', 'Passed', 'Absent'];
  const hRow = worksheet.getRow(11);
  hRow.values = headCols;
  hRow.height = 26;
  hRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    applyThinBorders(cell);
  });

  const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;

  let curRow = 12;
  students.forEach((st, idx) => {
    let failedCount = 0;
    let passedCount = 0;
    let absentCount = 0;

    const cleanName = String(st.name || '').replace(/ð[^\s]*/g, '').trim();
    const rowVals = [idx + 1, st.roll_no || st.rollNo || '-', cleanName];

    filteredSubjects.forEach(sub => {
      const sess = allSessions.find(s => s.subject_id === sub.id && s.session_label === sessionLabel);
      if (!sess) {
        absentCount++;
        rowVals.push('-');
        return;
      }

      let score = '-';
      if (is2021) {
        const sessionComps = allComponents.filter(c => c.session_id === sess.id);
        const studentMarks = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
        let rawCIA = 0;
        sessionComps.forEach(comp => {
          const markObj = studentMarks.find(m => m.component_id === comp.id);
          const val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
          const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || 100;
          rawCIA += Math.min(val, conducted);
        });
        const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(sub.type || '');
        const ciaMax = isLabType ? 50 : 40;
        const examConvertedMax = isLabType ? 50 : 60;
        const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);

        const attRec = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        const rawExam = attRec?.internal_exam_mark;
        const labRaw = attRec?.lab_mark;

        if (isLabType && sessionLabel === 'internal2') {
          const labExamConverted = Math.round(((parseFloat(labRaw) || 0) / 100) * 50);
          score = Math.min(ciaTotal + labExamConverted, 100);
        } else {
          const examConverted = Math.round(((parseFloat(rawExam) || 0) / 100) * examConvertedMax);
          score = Math.min(ciaTotal + examConverted, 100);
        }

        if ((rawExam === null || rawExam === undefined || rawExam === '') && (!isLabType || sessionLabel !== 'internal2')) {
          score = 'AB';
        }
      } else {
        const attRec = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        const rawExam = attRec?.internal_exam_mark;
        const studentMarks = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
        let sumAssignment = 0;
        studentMarks.forEach(m => sumAssignment += parseFloat(m.marks_obtained || 0));

        if (rawExam !== null && rawExam !== undefined && rawExam !== '' && !isNaN(parseFloat(rawExam))) {
          score = Math.round(parseFloat(rawExam));
        } else if (studentMarks.length > 0) {
          score = Math.round(sumAssignment);
        } else {
          score = 'AB';
        }
      }

      if (score === 'AB' || score === '-') {
        absentCount++;
      } else if (typeof score === 'number' && score >= 50) {
        passedCount++;
      } else {
        failedCount++;
      }

      rowVals.push(score);
    });

    rowVals.push(failedCount, passedCount, absentCount);

    const dRow = worksheet.getRow(curRow);
    dRow.values = rowVals;
    dRow.height = 20;

    const bg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
    for (let c = 1; c <= numCols; c++) {
      const cell = dRow.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      applyThinBorders(cell);

      if (c === 3) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    }
    curRow++;
  });

  curRow += 2;
  // Signatures
  const sigRow = worksheet.getRow(curRow);
  sigRow.values = ['', 'CLASS IN-CHARGE', '', 'HOD', '', '', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Print & Page Setup (Landscape A4, fit to width)
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    horizontalCentered: true,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4 },
    printTitlesRow: '11:11'
  };

  worksheet.getColumn(1).width = 7;
  worksheet.getColumn(2).width = 16;
  worksheet.getColumn(3).width = 30;
  for (let c = 4; c <= numCols; c++) {
    worksheet.getColumn(c).width = 12;
  }

  await triggerDownload(workbook, `${classObj?.name || 'Class'}_Consolidated_Mark_Statement.xlsx`);
};

/**
 * 6. Export Class Performance Report (NAC/TLP-20)
 */
export const exportClassAnalysisExcel = async ({
  classObj,
  sessionLabel = 'internal1',
  subjects = [],
  students = [],
  allSessions = [],
  allMarks = [],
  allAttendance = [],
  remarks = '',
  remedialAction = '',
  selectedSubjectIds,
  inchargeNameParam = '',
  user
}) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Class Performance');

  let filteredSubjects = subjects.filter(s => s.code !== 'LIB' && s.name.toUpperCase() !== 'LIBRARY');
  if (selectedSubjectIds && selectedSubjectIds.length > 0) {
    filteredSubjects = filteredSubjects.filter(s => selectedSubjectIds.includes(s.id));
  }

  await drawExcelCollegeHeader({
    workbook,
    worksheet,
    title: `TEST ANALYSIS REPORT (CLASS WISE / PERFORMANCE ANALYSIS) — ${sessionLabel === 'internal1' ? 'INTERNAL TEST 1' : 'INTERNAL TEST 2'}`,
    formatNo: 'NAC/TLP-20',
    numCols: 9
  });

  // Metadata Block
  const meta = [
    ['Year / Semester:', `${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, '', 'Department:', classObj?.department || 'Information Technology'],
    ['Class In-Charge:', inchargeNameParam || user?.name || 'Class In-charge', '', 'Academic Year:', '2026 - 2027'],
    ['Internal Test:', sessionLabel === 'internal1' ? 'Internal Test 1 with Assignment' : 'Internal Test 2 with Assignment', '', 'Student Strength:', `${students.length} Students`]
  ];

  meta.forEach((row, i) => {
    const r = worksheet.getRow(7 + i);
    r.values = row;
    r.font = { name: 'Arial', size: 9 };
    r.getCell(1).font = { bold: true };
    r.getCell(4).font = { bold: true };
    r.height = 18;
  });

  worksheet.getRow(10).height = 8; // spacer

  // Table Header (Row 11)
  const hRow = worksheet.getRow(11);
  hRow.values = ['S.No', 'Subject Code', 'Subject Name', 'Staff In-Charge', 'Total Strength', 'Appeared', 'Passed', 'Failed', 'Pass %'];
  hRow.height = 24;
  hRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    applyThinBorders(cell);
  });

  let curRow = 12;
  filteredSubjects.forEach((sub, idx) => {
    const sess = allSessions.find(s => s.subject_id === sub.id && s.session_label === sessionLabel);
    let passed = students.length;
    let failed = 0;
    let appeared = students.length;
    let passPct = '100.00';

    if (sess) {
      const attRows = allAttendance.filter(a => a.session_id === sess.id);
      let p = 0;
      let f = 0;
      attRows.forEach(r => {
        const mark = parseFloat(r.internal_exam_mark);
        if (!isNaN(mark)) {
          if (mark >= 50) p++;
          else f++;
        }
      });
      if (p + f > 0) {
        passed = p;
        failed = f;
        appeared = p + f;
        passPct = ((p / appeared) * 100).toFixed(2);
      }
    }

    const faculty = sub.faculty_name || sub.staff_name || 'Faculty Staff';
    const rowVals = [
      idx + 1,
      sub.code,
      sub.name,
      faculty,
      students.length,
      appeared,
      passed,
      failed,
      `${passPct}%`
    ];

    const dRow = worksheet.getRow(curRow);
    dRow.values = rowVals;
    dRow.height = 20;

    const bg = idx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
    for (let c = 1; c <= 9; c++) {
      const cell = dRow.getCell(c);
      cell.font = { name: 'Arial', size: 9 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      applyThinBorders(cell);

      if (c === 3 || c === 4) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      } else {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      if (c === 9) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: '166534' } };
      }
    }
    curRow++;
  });

  if (remarks || remedialAction) {
    curRow += 1;
    if (remarks) {
      const remRow = worksheet.getRow(curRow);
      remRow.values = ['Remarks:', remarks];
      remRow.getCell(1).font = { bold: true };
      curRow++;
    }
    if (remedialAction) {
      const actRow = worksheet.getRow(curRow);
      actRow.values = ['Remedial Action:', remedialAction];
      actRow.getCell(1).font = { bold: true };
      curRow++;
    }
  }

  curRow += 2;
  // Signatures
  const sigRow = worksheet.getRow(curRow);
  sigRow.values = ['', 'CLASS IN-CHARGE', '', 'HOD', '', '', 'PRINCIPAL'];
  sigRow.height = 24;
  sigRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: '0F172A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  worksheet.columns = [
    { width: 7 },
    { width: 14 },
    { width: 32 },
    { width: 24 },
    { width: 14 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 }
  ];

  await triggerDownload(workbook, `${classObj?.name || 'Class'}_Class_Performance_Report.xlsx`);
};

export default {
  exportSubjectMarksExcel,
  exportLaboratoryMarksExcel,
  exportOverallMarksExcel,
  exportSubjectAnalysisExcel,
  exportConsolidatedMarksExcel,
  exportClassAnalysisExcel
};


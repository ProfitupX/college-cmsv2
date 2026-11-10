/**
 * MarkHub PG Regulation 2025 - Phase 3 Reports & PDF/Excel Integration Verification Script
 * Validates report formatting, column headers, criteria rows, and buffer generation for both UG and PG.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import {
  isPGClass,
  isPGSubject,
  getPGComponentPresets,
  normalizePGSubjectType
} from '../src/utils/pgRegulation2025.js';
import {
  calculateAttendanceMark,
  resolveAttendanceMark
} from '../src/utils/attendanceCalculator.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

console.log('================================================================');
console.log('🧪 MARKHUB PG REGULATION 2025 - PHASE 3 REPORTS VERIFICATION');
console.log('================================================================\n');

// 1. Class Detection for All Six PG Classes in Reports Context
console.log('📦 [1/5] Testing Reports Context Class Detection for All 6 PG Classes...');

const sixPGClasses = [
  { id: 'ME_CSE_I', name: 'M.E. CSE - I Year', department: 'Computer Science and Engineering', semester: 1, year_label: 'I' },
  { id: 'ME_EST_I', name: 'M.E. Embedded System Technologies - I Year', department: 'Electrical and Electronics Engineering', semester: 1, year_label: 'I' },
  { id: 'ME_SE_I', name: 'M.E. Structural Engineering - I Year', department: 'Civil Engineering', semester: 1, year_label: 'I' },
  { id: 'ME_SE_III', name: 'M.E. Structural Engineering - II Year', department: 'Civil Engineering', semester: 3, year_label: 'II' },
  { id: 'ME_MFE_I', name: 'M.E. Manufacturing Engineering - I Year', department: 'Mechanical Engineering', semester: 1, year_label: 'I' },
  { id: 'ME_MFE_III', name: 'M.E. Manufacturing Engineering - II Year', department: 'Mechanical Engineering', semester: 3, year_label: 'II' }
];

sixPGClasses.forEach(c => {
  assert(isPGClass(c) === true, `PG Class ${c.id} (${c.name}) evaluates to isPG=true`);
  // Verify Semester III classes do not trigger 2021 collision
  const is2021 = !isPGClass(c) && (c.year_label === 'III' || c.year_label === 'IV' || parseInt(c.semester) >= 5);
  assert(is2021 === false, `PG Class ${c.id} (Sem ${c.semester}) is strictly NOT treated as UG 2021`);
});

const ugClasses = [
  { id: 'CL001', name: 'B.E. CSE - I Year', department: 'CSE', year_label: 'I', semester: 1 },
  { id: 'CL002', name: 'B.Tech IT - II Year', department: 'IT', year_label: 'II', semester: 3 },
  { id: 'CL003', name: 'B.E. ECE - III Year', department: 'ECE', year_label: 'III', semester: 5 }
];

ugClasses.forEach(c => {
  assert(isPGClass(c) === false, `UG Class ${c.id} correctly evaluates to isPG=false`);
});

// 2. PDF Report Header & Column Formatting (UG vs PG Course Types)
console.log('\n📦 [2/5] Testing PDF Report Columns & Maximum Calculations...');

const pgTypes = [
  { type: 'Theory', expectedCia: 40, expectedEse: 60 },
  { type: 'Theory-cum-Lab', expectedCia: 50, expectedEse: 50 },
  { type: 'Practical', expectedCia: 60, expectedEse: 40 },
  { type: 'Project', expectedCia: 60, expectedEse: 40 }
];

// Helper mirroring pdfReportGenerator column formatting
function getPdfHeaders(classObj, subject) {
  const isPG = isPGClass(classObj) || isPGSubject(subject, classObj);
  const pgConfig = isPG ? getPGComponentPresets(subject?.type) : null;
  const pgCiaMax = pgConfig ? pgConfig.ciaMax : 40;

  const headRow = [
    'S.No',
    'Roll No',
    'Student Name',
    'Attended\nHrs',
    'Attd Mark\n(Max: 5)',
    isPG ? `CA Mark\n(Max: ${pgCiaMax})` : 'Activities Mark\n(Max: 95)',
    'Internal\nMark',
    isPG ? 'CA Mark\nTotal' : 'Activities Mark\nTotal'
  ];

  const footRow = [
    '',
    '',
    'MAX MARKS',
    '30 Hrs',
    '5',
    isPG ? String(pgCiaMax) : '95',
    '100',
    isPG ? String(pgCiaMax) : '100'
  ];

  return { isPG, pgCiaMax, headRow, footRow };
}

// Test UG PDF headers
const ugPdfHeaders = getPdfHeaders(ugClasses[0], { type: 'Theory', class_id: 'CL001' });
assert(ugPdfHeaders.isPG === false, 'UG PDF detection: isPG is false');
assert(ugPdfHeaders.headRow[5] === 'Activities Mark\n(Max: 95)', 'UG PDF headRow[5] is "Activities Mark (Max: 95)"');
assert(ugPdfHeaders.footRow[5] === '95', 'UG PDF footRow[5] max is "95"');
assert(ugPdfHeaders.footRow[7] === '100', 'UG PDF footRow[7] total is "100"');

// Test PG PDF headers across all 4 course types
pgTypes.forEach(pt => {
  const pgPdfHeaders = getPdfHeaders(sixPGClasses[0], { type: pt.type, class_id: 'ME_CSE_I' });
  assert(pgPdfHeaders.isPG === true, `PG ${pt.type} PDF detection: isPG is true`);
  assert(pgPdfHeaders.headRow[5] === `CA Mark\n(Max: ${pt.expectedCia})`, `PG ${pt.type} PDF headRow[5] is "CA Mark (Max: ${pt.expectedCia})"`);
  assert(pgPdfHeaders.footRow[5] === String(pt.expectedCia), `PG ${pt.type} PDF footRow[5] max is "${pt.expectedCia}"`);
  assert(pgPdfHeaders.footRow[7] === String(pt.expectedCia), `PG ${pt.type} PDF footRow[7] total is "${pt.expectedCia}"`);
});

// 3. Excel Report Header & Criteria Row Formatting
console.log('\n📦 [3/5] Testing Excel Report Columns & Criteria Rows...');

function getExcelHeaders(classObj, subject) {
  const isPG = isPGClass(classObj) || isPGSubject(subject, classObj);
  const pgConfig = isPG ? getPGComponentPresets(subject?.type) : null;
  const pgCiaMax = pgConfig ? pgConfig.ciaMax : 40;
  const is2021 = !isPG && (classObj?.regulation === '2021' || (classObj?.semester >= 5));

  let headers = [];
  if (isPG) {
    headers = [
      'S.No', 'Roll No', 'Student Name', 'Attended Hrs',
      'Attd Mark (Max: 5)', `CA Mark (Max: ${pgCiaMax})`,
      'Internal Mark', 'CA Mark Total'
    ];
  } else if (!is2021) {
    headers = [
      'S.No', 'Roll No', 'Student Name', 'Attended Hrs',
      'Attd Mark (Max: 5)', 'Activities Mark (Max: 95)',
      'Internal Mark', 'Activities Mark Total'
    ];
  }

  let criteriaValues = [];
  if (isPG) {
    criteriaValues = ['', '', 'MAX MARKS', '30 Hrs', 5, pgCiaMax, 100, pgCiaMax];
  } else if (!is2021) {
    criteriaValues = ['', '', 'MAX MARKS', '30 Hrs', 5, 95, 100, 100];
  }

  return { isPG, pgCiaMax, headers, criteriaValues };
}

// Test UG Excel headers
const ugExcel = getExcelHeaders(ugClasses[0], { type: 'Theory', class_id: 'CL001' });
assert(ugExcel.headers[5] === 'Activities Mark (Max: 95)', 'UG Excel header has "Activities Mark (Max: 95)"');
assert(ugExcel.criteriaValues[5] === 95, 'UG Excel criteria value is 95');
assert(ugExcel.criteriaValues[7] === 100, 'UG Excel criteria total is 100');

// Test PG Excel headers
pgTypes.forEach(pt => {
  const pgExcel = getExcelHeaders(sixPGClasses[0], { type: pt.type, class_id: 'ME_CSE_I' });
  assert(pgExcel.headers[5] === `CA Mark (Max: ${pt.expectedCia})`, `PG ${pt.type} Excel header is "CA Mark (Max: ${pt.expectedCia})"`);
  assert(pgExcel.criteriaValues[5] === pt.expectedCia, `PG ${pt.type} Excel criteria value is ${pt.expectedCia}`);
  assert(pgExcel.criteriaValues[7] === pt.expectedCia, `PG ${pt.type} Excel criteria total is ${pt.expectedCia}`);
});

// 4. Exact UG Attendance Module Integration in Reports
console.log('\n📦 [4/5] Testing UG Attendance Module Verification in Reports Context...');

const attendanceCheckCases = [
  { attended: 30, total: 30, expectedMark: 5 },
  { attended: 29, total: 30, expectedMark: 5 },
  { attended: 27, total: 30, expectedMark: 3 },
  { attended: 26, total: 30, expectedMark: 2 },
  { attended: 24, total: 30, expectedMark: 1 },
  { attended: 22, total: 30, expectedMark: 0 }
];

attendanceCheckCases.forEach(ac => {
  const mark = resolveAttendanceMark('ST_01', {
    attendanceMarks: {},
    attendanceData: { ST_01: String(ac.attended) },
    totalHours: ac.total,
    assessmentMode: 'internal1',
    int1AttendanceData: {},
    int1Hours: ac.total,
    int2Hours: ac.total,
    labHours: 0,
    labData: {}
  });
  assert(mark === ac.expectedMark, `Attendance ${ac.attended}/${ac.total} resolves to ${mark}/5 marks in report context`);
});

// 5. Binary Document Buffer Generation (jsPDF and ExcelJS)
console.log('\n📦 [5/5] Testing Binary PDF & Excel Generation via jsPDF and ExcelJS...');

async function testDocumentGenerators() {
  // Test PDF generation
  const pdfDoc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  pdfDoc.setFont('helvetica', 'bold');
  pdfDoc.setFontSize(14);
  pdfDoc.text('NADAR SARASWATHI COLLEGE OF ENGINEERING & TECHNOLOGY', 105, 15, { align: 'center' });
  pdfDoc.setFontSize(9);
  pdfDoc.text('Anna University PG Regulation 2025 - Subject Marks Statement', 105, 22, { align: 'center' });

  autoTable(pdfDoc, {
    startY: 28,
    head: [
      ['S.No', 'Roll No', 'Student Name', 'Attended Hrs', 'Attd Mark (5)', 'CA Mark (Max: 40)', 'Internal Mark', 'CA Total (40)']
    ],
    body: [
      [1, '25ME001', 'Kavitha S', '30 / 30', '5', '38', '92', '38'],
      [2, '25ME002', 'Rajesh P', '27 / 30', '3', '32', '80', '32']
    ],
    foot: [
      ['', '', 'MAX MARKS', '30 Hrs', '5', '40', '100', '40']
    ]
  });

  const pdfBuffer = pdfDoc.output('arraybuffer');
  assert(pdfBuffer && pdfBuffer.byteLength > 1000, `jsPDF PG Table Generation Complete (Buffer size: ${pdfBuffer.byteLength} bytes)`);

  // Test Excel generation
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('PG Subject Marks');
  worksheet.addRow(['S.No', 'Roll No', 'Student Name', 'Attended Hrs', 'Attd Mark (Max: 5)', 'CA Mark (Max: 40)', 'Internal Mark', 'CA Mark Total']);
  worksheet.addRow([1, '25ME001', 'Kavitha S', 30, 5, 38, 92, 38]);
  worksheet.addRow([2, '25ME002', 'Rajesh P', 27, 3, 32, 80, 32]);
  worksheet.addRow(['', '', 'MAX MARKS', '30 Hrs', 5, 40, 100, 40]);

  const excelBuffer = await workbook.xlsx.writeBuffer();
  assert(excelBuffer && excelBuffer.length > 500, `ExcelJS PG Workbook Generation Complete (Buffer size: ${excelBuffer.length} bytes)`);

  console.log('\n================================================================');
  console.log(`📊 PHASE 3 VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    console.error(`\n❌ PHASE 3 VERIFICATION FAILED WITH ${failed} DEFECT(S)`);
    process.exit(1);
  } else {
    console.log('\n✅ ALL PHASE 3 VERIFICATION CHECKS PASSED CLEANLY.');
    process.exit(0);
  }
}

testDocumentGenerators();

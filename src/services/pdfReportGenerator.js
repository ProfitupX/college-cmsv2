import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImg from '../assets/nscetimg.jpeg';

// Helper to convert image URL/imported asset to base64 DataURL
const getImageDataUrl = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/jpeg'));
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

const addFooterToAllPages = (doc, dateStr, timeStr) => {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${dateStr} at ${timeStr} via NSCET Mark Hub`, 14, 290);
  }
};

// Helper for Header Box matching College Format
const drawCollegeHeader = async (doc, title, formatNo, revNo, dateStr, pageStr) => {
  const logoBase64 = await getImageDataUrl(logoImg);
  const now = new Date();
  const currentDate = dateStr || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const currentTime = now.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS
  
  // Outer Border for Header Box
  doc.rect(10, 8, 190, 26);
  doc.line(150, 8, 150, 34); // Right divider for Format Info
  
  // Format Info Box on top right
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(`Format No. : ${formatNo || 'NAC/TLP-07a.21'}`, 152, 13);
  doc.text(`Rev.No     : ${revNo || '01'}`, 152, 18);
  doc.text(`Date       : ${currentDate}`, 152, 23);
  doc.text(`Page       : ${pageStr || '01'}`, 152, 28);
  
  // Lines inside Format Info Box
  doc.line(150, 14.5, 200, 14.5);
  doc.line(150, 19.5, 200, 19.5);
  doc.line(150, 24.5, 200, 24.5);

  // Logo & Title
  if (logoBase64) {
    try {
      // Expanded to fill the left section (width 140, from x=10 to 150) with 1mm padding
      // X = 11, Y = 9, Width = 138, Height = 24
      doc.addImage(logoBase64, 'JPEG', 11, 9, 138, 24);
    } catch (e) {
      console.warn("Could not render logo in PDF", e);
    }
  }

  // The text banner was removed per user request.

  // Banner Title Bar
  doc.rect(10, 34, 190, 7);
  doc.setFillColor(245, 247, 250);
  doc.rect(10.1, 34.1, 189.8, 6.8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(title, 105, 38.5, { align: 'center' });
};

// ─────────────────────────────────────────────────────────────
// REPORT 1: Test Analysis Report (Subject Wise) - Format NAC/TLP-07a.21
// ─────────────────────────────────────────────────────────────
export const generateSubjectAnalysisPDF = async ({
  subject, classObj, staff, session, remedialAction, students, marksData, components, attendanceData, internalExamData, labData, assessmentMode, declarationData
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  await drawCollegeHeader(doc, 'Test Analysis Report (Subject wise)', 'NAC/TLP-07a.21', '01', '', '1 of 1');

  // Subheader Details Table Block
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  let y = 46;
  doc.text(`Year / Sem             : ${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, 14, y);
  doc.text(`Dept                       : ${subject?.department || 'IT'}`, 120, y);
  y += 5;
  doc.text(`Staff Name            : ${staff?.name || 'Faculty Staff'}`, 14, y);
  doc.text(`Academic Year    : 2026 - 2027`, 120, y);
  y += 5;
  doc.text(`Subject Code \\ Name : ${subject?.code} / ${subject?.name}`, 14, y);
  doc.text(`Date                      : ${new Date().toLocaleDateString('en-GB')}`, 120, y);
  y += 5;
  doc.text(`Internal / Model Test : ${assessmentMode === 'internal1' ? 'Internal Test 1 with Assignment' : 'Internal Test 2 with Assignment'}`, 14, y);
  doc.text(`Student Strength   : ${students.length}`, 120, y);
  y += 7;

  // Grade Distribution Calculation (0-49 U, 50-55 E, 56-59 D, 60-69 C, 70-79 B, 80-89 A, 90-100 S)
  const gradeCounts = { U: 0, E: 0, D: 0, C: 0, B: 0, A: 0, S: 0 };
  let appeared = 0;
  let passed = 0;
  let failed = 0;
  let absent = 0;
  let maxMark = 0;
  let minMark = 100;

  const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
  const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type || '');
  const ciaMax = isLabType ? 50 : 40;
  const examConvertedMax = isLabType ? 50 : 60;

  students.forEach(st => {
    let mark = 0;
    let isAbsent = false;

    if (is2021) {
      let rawCIA = 0;
      if (components && marksData) {
        const isArray = Array.isArray(marksData);
        components.forEach(comp => {
          let val = 0;
          if (isArray) {
            const markObj = marksData.find(m => m.component_id === comp.id && m.student_id === st.id);
            val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
          } else {
            // Support MarksEntryPage2021 marksData format which could be { [st.id]: { [uid]: mark } }
            val = (marksData[st.id] && marksData[st.id][comp.uid || comp.id]) ? parseFloat(marksData[st.id][comp.uid || comp.id]) : 0;
          }
          const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || parseFloat(comp.conductedMax) || parseFloat(comp.max) || 100;
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
      return;
    }
    
    appeared++;
    if (mark > maxMark) maxMark = mark;
    if (mark < minMark) minMark = mark;

    let passMarkThreshold = 60; // Default for Theory
    if (isLabType || subject?.type?.toLowerCase().includes('lab') || subject?.type?.toLowerCase().includes('practical')) {
      passMarkThreshold = 50; // Theory-cum-Lab / Lab
    }

    if (mark >= passMarkThreshold) passed++;
    else failed++;

    if (mark < 50) gradeCounts.U++;
    else if (mark <= 55) gradeCounts.E++;
    else if (mark <= 59) gradeCounts.D++;
    else if (mark <= 69) gradeCounts.C++;
    else if (mark <= 79) gradeCounts.B++;
    else if (mark <= 89) gradeCounts.A++;
    else gradeCounts.S++;
  });

  if (appeared === 0) minMark = 0;

  const passPct = appeared > 0 ? ((passed / appeared) * 100).toFixed(1) : '100.0';

  // Section 1 Header
  doc.setFont('helvetica', 'bold');
  doc.text('1. Performance Analysis:', 14, y);
  y += 3;

  // Grade Buckets Table
  autoTable(doc, {
    startY: y,
    head: [
      ['Description', '0-49 (U)', '50-55 (E)', '56-59 (D)', '60-69 (C)', '70-79 (B)', '80-89 (A)', '90-100 (S)']
    ],
    body: [
      [
        'No. of Students',
        gradeCounts.U, gradeCounts.E, gradeCounts.D, gradeCounts.C, gradeCounts.B, gradeCounts.A, gradeCounts.S
      ],
      [
        '% of Students',
        appeared > 0 ? ((gradeCounts.U/appeared)*100).toFixed(0) : '0',
        appeared > 0 ? ((gradeCounts.E/appeared)*100).toFixed(0) : '0',
        appeared > 0 ? ((gradeCounts.D/appeared)*100).toFixed(0) : '0',
        appeared > 0 ? ((gradeCounts.C/appeared)*100).toFixed(0) : '0',
        appeared > 0 ? ((gradeCounts.B/appeared)*100).toFixed(0) : '0',
        appeared > 0 ? ((gradeCounts.A/appeared)*100).toFixed(0) : '0',
        appeared > 0 ? ((gradeCounts.S/appeared)*100).toFixed(0) : '0'
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fillColor: [240, 242, 245], textColor: [0,0,0], fontStyle: 'bold' }
  });

  y = doc.lastAutoTable.finalY + 5;

  // Summary Metrics Table Block
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`No. of Students Appeared :  ${appeared}`, 14, y);
  doc.text(`Pass Percentage  :  ${passPct}%`, 120, y);
  y += 5;
  doc.text(`No. of Students Passed     :  ${passed}`, 14, y);
  doc.text(`Max Mark Secured :  ${maxMark}`, 120, y);
  y += 5;
  doc.text(`No. of Students Failed       :  ${failed}`, 14, y);
  doc.text(`Min Mark Secured :  ${minMark}`, 120, y);
  y += 5;
  doc.text(`No. of Students Absent     :  ${absent}`, 14, y);
  y += 8;

  // Section 2: Declaration
  doc.setFont('helvetica', 'bold');
  doc.text('2. Declaration by Staff:', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('   I Certify that:', 14, y);
  y += 5;
  doc.text(`   a) The Classes were conducted as per the course plan given to the students.   ${declarationData?.conductedAsPerPlan || 'Yes'}`, 14, y);
  y += 5;
  doc.text(`   b) The Number of classes   As per Plan: ${declarationData?.classesPlanned || '20'}       Actually taken: ${declarationData?.classesTaken || '23'}`, 14, y);
  y += 5;
  doc.text(`   c) The result according to my opinion is: ${declarationData?.resultOpinion || 'Moderate / Good'}`, 14, y);
  y += 8;

  // Questions
  doc.setFont('helvetica', 'bold');
  doc.text(`3. Is the pass percentage is less than 75%?   ${declarationData?.lessThan75 || 'No'}`, 14, y);
  y += 5;
  doc.text(`4. If yes write the reason for more failures: ${declarationData?.reasonForFailures || '-'}`, 14, y);
  y += 5;
  doc.text(`5. Is the pass percentage is less than previous Internal Test?   ${declarationData?.lessThanPrevTest || 'No'}`, 14, y);
  y += 5;
  doc.text(`6. If yes write the reason: ${declarationData?.reasonForPrevTest || '-'}`, 14, y);
  y += 8;

  // Remedial Actions
  doc.text('7. Plan of Remedial actions to improve the pass percentage:', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`   ${declarationData?.remedialActions || remedialAction || session?.remedial_action || 'Regular Writing practice.'}`, 14, y);
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text(`8. Principal's suggestions to improve the pass percentage: ${declarationData?.principalSuggestions || '-'}`, 14, y);
  
  // Signature Block - Pushed down lower for better alignment
  y = doc.internal.pageSize.getHeight() - 30; // 30mm from the bottom of the page
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('STAFF INCHARGE', 20, y);
  doc.text('HOD', 75, y);
  doc.text('VICE PRINCIPAL', 120, y);
  doc.text('PRINCIPAL', 170, y);

  const now = new Date();
  addFooterToAllPages(doc, now.toLocaleDateString('en-GB'), now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`${subject?.code}_Subject_Analysis_Report.pdf`);
};

// ─────────────────────────────────────────────────────────────
// REPORT: Subject Marks List (Standard format, non-analytical)
// ─────────────────────────────────────────────────────────────
export const generateSubjectMarksListPDF = async ({
  subject, classObj, staff, session, students, marksData, attendanceData, internalExamData, labData, assessmentMode, components,
  int1Hours, int2Hours, labHours, int1AttendanceData
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  
  await drawCollegeHeader(doc, `${assessmentMode === 'internal1' ? 'Internal Assessment 1' : 'Internal Assessment 2'} - Subject Marks List`, '', '', '', '1 of 1');
  
  let y = 46;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Year / Sem             : ${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, 14, y);
  doc.text(`Dept                       : ${subject?.department || 'IT'}`, 120, y);
  y += 5;
  doc.text(`Staff Name            : ${staff?.name || 'Faculty Staff'}`, 14, y);
  doc.text(`Academic Year    : 2026 - 2027`, 120, y);
  y += 5;
  const totHoursDisplay = parseInt(int1Hours || 0) + parseInt(int2Hours || 0) + parseInt(labHours || 0) || totalHours || 0;
  doc.text(`Subject Code \\ Name : ${subject?.code} / ${subject?.name}   |   Total Hrs: ${totHoursDisplay}`, 14, y);
  doc.text(`Date                      : ${new Date().toLocaleDateString('en-GB')}`, 120, y);
  y += 8;

  const isInternal2 = assessmentMode === 'internal2';
  const hasLab = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type);
  
  // Prepare Table Headers
  const headRow = ['S.No', 'Roll No', 'Name', 'P Hrs', '100 marks internal', 'Activities mark'];

  // Prepare Table Body
  let finalTotalMaxHours = 0;
  const bodyRows = students.map((student, idx) => {
    // 1. Calculate Internal Marks
    let convertedTotal = 0;
    components.forEach(c => {
      const val = parseFloat(marksData[student.id]?.[c.uid]) || 0;
      const conducted = parseFloat(c.conductedMax) || 100;
      convertedTotal += Math.min(val, conducted);
    });
    convertedTotal = Math.round(convertedTotal);

    // 2. Calculate Attendance Mark
    const getAttendanceMark = (attended, maxHours) => {
      if (!maxHours || maxHours <= 0) return 0;
      const pct = (attended / maxHours) * 100;
      if (pct >= 80 && pct <= 85) return 1;
      if (pct > 85 && pct <= 90) return 2;
      if (pct > 90 && pct <= 95) return 3;
      if (pct > 95) return 5;
      return 0; // Below 80% is 0 mark
    };

    let attendanceMark = 0;
    let attendanceDaysStr = '';

    if (!isInternal2) {
      const tHours = parseInt(int1Hours || 0);
      const aHours = parseInt(attendanceData[student.id] || 0);
      finalTotalMaxHours = tHours;
      if (tHours > 0 && !isNaN(aHours)) {
        attendanceMark = getAttendanceMark(aHours, tHours);
      }
      attendanceDaysStr = isNaN(aHours) ? '-' : `${aHours}`;
    } else {
      const i1Attd = parseInt(int1AttendanceData[student.id] || 0);
      const i2Attd = parseInt(attendanceData[student.id] || 0);
      const lAttd  = hasLab ? parseInt(labData[student.id]?.labAttendance || 0) : 0;
      const cumulativeAttended = i1Attd + i2Attd + lAttd;

      const i1Max = parseInt(int1Hours || 0);
      const i2Max = parseInt(int2Hours || 0);
      const lMax  = hasLab ? parseInt(labHours || 0) : 0;
      const cumulativeMaxHours = i1Max + i2Max + lMax;
      
      finalTotalMaxHours = cumulativeMaxHours;

      if (cumulativeMaxHours > 0) {
        attendanceMark = getAttendanceMark(cumulativeAttended, cumulativeMaxHours);
      }
      attendanceDaysStr = `${cumulativeAttended}`;
    }

    const finalScore = convertedTotal + attendanceMark;

    const internalExamMark = internalExamData[student.id];
    const internalExamMarkStr = (internalExamMark !== undefined && internalExamMark !== '') ? Math.round(parseFloat(internalExamMark)) : '-';

    const row = [
      idx + 1,
      student.roll_no,
      student.name,
      attendanceDaysStr,          // P Hrs
      internalExamMarkStr,        // 100 marks internal
      convertedTotal              // Activities mark
    ];

    return row;
  });

  const footRow = Array(headRow.length).fill('');
  const attdColIdx = headRow.indexOf('Attendance');
  if (attdColIdx !== -1 && finalTotalMaxHours > 0) {
    footRow[attdColIdx] = `Total Hrs:\n${finalTotalMaxHours}`;
  }

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: bodyRows,
    foot: [footRow],
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fillColor: [240, 242, 245], textColor: [0,0,0], fontStyle: 'bold' },
    footStyles: { fillColor: [255, 255, 255], textColor: [0,0,0], fontStyle: 'bold' },
    columnStyles: { 2: { halign: 'left' } }
  });

  // Footer Signatures
  y = doc.lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'bold');
  doc.text('STAFF INCHARGE', 20, y);
  doc.text('HOD', 170, y);

  const now = new Date();
  addFooterToAllPages(doc, now.toLocaleDateString('en-GB'), now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`${subject?.code}_Marks_List.pdf`);
};

// ─────────────────────────────────────────────────────────────
// REPORT 2: Consolidated Test Analysis Report (Class Wise) - Format NAC/TLP-20
// ─────────────────────────────────────────────────────────────
export const generateClassAnalysisPDF = async ({
  classObj, sessionLabel = 'internal1', subjects, students, allSessions, allMarks, allAttendance, remarks, remedialAction
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  await drawCollegeHeader(doc, 'Test Analysis Report (Class wise / Performance Analysis)', 'NAC/TLP-20', '01', '', '1 of 1');

  let y = 46;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Year/Sem        : ${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, 14, y);
  doc.text(`Dept                  : ${classObj?.department || 'IT'}`, 120, y);
  y += 5;
  doc.text(`Internal Test   : ${sessionLabel === 'internal1' ? 'Internal Test 1 with Assignment' : 'Internal Test 2 with Assignment'}`, 14, y);
  doc.text(`Academic Year : 2026 - 2027`, 120, y);
  y += 5;
  doc.text(`Student Strength : ${students.length}`, 14, y);
  doc.text(`Date                 : ${new Date().toLocaleDateString('en-GB')}`, 120, y);
  y += 7;

  doc.setFont('helvetica', 'bold');
  doc.text('1. Performance Analysis:', 14, y);
  y += 3;

  // Build rows for each subject in class
  const subjectRows = subjects.map((sub, idx) => {
    // Find session for this sub
    const sess = allSessions.find(s => s.subject_id === sub.id);
    let passed = students.length;
    let failed = 0;
    let passPct = '100.00';

    if (sess) {
      // Check internal exam marks for this session
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
        passPct = ((p / (p + f)) * 100).toFixed(2);
      }
    }

    return [
      idx + 1,
      sub.name,
      sub.code,
      sub.staff_name || 'Staff',
      passed,
      failed,
      `${passPct}%`
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Sl.No', 'Subject Name', 'Subject Code', 'Staff Name', 'No. of Students Passed', 'No. of Students Failed', 'Pass Percentage']],
    body: subjectRows,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fillColor: [240, 242, 245], textColor: [0,0,0], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'left' } }
  });

  y = doc.lastAutoTable.finalY + 6;

  // Failure Count Summary Table (Dynamic calculation per student)
  doc.setFont('helvetica', 'bold');
  doc.text('2. Failure Count in this Internal Test:', 14, y);
  y += 3;

  let allPassCount = 0;
  let oneFailCount = 0;
  let twoFailCount = 0;
  let threeFailCount = 0;
  let moreFailCount = 0;

  students.forEach(st => {
    let failCount = 0;
    subjects.forEach(sub => {
      const sess = allSessions.find(s => s.subject_id === sub.id);
      if (!sess) return;
      const att = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
      if (!att || att.internal_exam_mark === null || att.internal_exam_mark === undefined || att.internal_exam_mark === '') {
        failCount++;
      } else {
        const mark = parseFloat(att.internal_exam_mark);
        if (isNaN(mark) || mark < 50) {
          failCount++;
        }
      }
    });

    if (failCount === 0) allPassCount++;
    else if (failCount === 1) oneFailCount++;
    else if (failCount === 2) twoFailCount++;
    else if (failCount === 3) threeFailCount++;
    else moreFailCount++;
  });

  const passPctClass = students.length > 0 ? ((allPassCount / students.length) * 100).toFixed(1) + '%' : '100%';

  autoTable(doc, {
    startY: y,
    head: [['Description', 'All Pass', 'One Sub Failure', 'Two Sub Failure', 'Three Sub Failure', 'More than Three Failure', '% of Pass']],
    body: [
      ['No.of Students', allPassCount, oneFailCount, twoFailCount, threeFailCount, moreFailCount, passPctClass]
    ],
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center' },
    headStyles: { fillColor: [240, 242, 245], textColor: [0,0,0], fontStyle: 'bold' }
  });

  y = doc.lastAutoTable.finalY + 6;

  // Faculty Feedback Corrective Action Table
  doc.setFont('helvetica', 'bold');
  doc.text('3. Faculty Feed Back - Corrective Action:', 14, y);
  y += 3;

  const remedialRows = subjects.map(sub => {
    const session = allSessions.find(s => s.subject_id === sub.id && s.session_label === sessionLabel);
    return [
      sub.code,
      sub.name,
      sub.staff_name || 'Staff',
      session?.remedial_action || 'Plan to conduct regular tests and revision of Anna University questions.'
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Subject Code', 'Subject Name', 'Faculty Name', 'Remedial Actions to be taken by the Faculty']],
    body: remedialRows,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [240, 242, 245], textColor: [0,0,0], fontStyle: 'bold' },
    columnStyles: { 3: { cellWidth: 80 } }
  });

  y = doc.lastAutoTable.finalY + 6;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`4. Remarks by HOD / Class In-charge: ${remarks || 'Satisfactory performance.'}`, 14, y);
  y += 5;
  doc.text(`5. Overall Improvement Plan: ${remedialAction || 'Follow up with slow learners.'}`, 14, y);
  y += 18;

  if (y > 270) {
    doc.addPage();
    y = 30;
  }

  // Signatures (Class Incharge, HOD, VP, Principal)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLASS IN-CHARGE', 16, y);
  doc.text('HOD', 75, y);
  doc.text('VICE PRINCIPAL', 125, y);
  doc.text('PRINCIPAL', 172, y);

  const now = new Date();
  addFooterToAllPages(doc, now.toLocaleDateString('en-GB'), now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`${classObj?.name}_Class_Analysis_Report.pdf`);
};

export const generateCollegeOverviewPDF = async ({ overview, departmentStats, user }) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  await drawCollegeHeader(doc, 'COLLEGE PERFORMANCE OVERVIEW', 'NSCET/PRIN/01', '0', null, '1 of 1');

  let y = 46;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Key Metrics:', 14, y);
  
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Students: ${overview.totalStudents}`, 20, y);
  doc.text(`Total Departments: ${overview.totalDepartments}`, 20, y + 6);
  doc.text(`Total Faculty: ${overview.totalFaculty}`, 120, y);
  doc.text(`College Average Score: ${overview.collegeAvg} / 100`, 120, y + 6);

  y += 18;
  // Department-wise Stats
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Department-wise Detailed Analytics:', 14, y);
  
  y += 4;

  const tableBody = departmentStats.map((dept, i) => {
    let status = 'Needs Attention';
    const score = parseFloat(dept.avgScore) || 0;
    if (score >= 60) status = 'Excellent';
    else if (score >= 40) status = 'Average';

    return [
      i + 1,
      dept.department,
      dept.totalStudents,
      score.toFixed(1),
      status
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['S.No', 'Department Name', 'Total Students', 'Avg Score', 'Status']],
    body: tableBody,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0,0,0] },
    bodyStyles: { lineWidth: 0.1, lineColor: [0,0,0] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' }
    }
  });

  // Footer Signatures
  const finalY = doc.lastAutoTable.finalY + 30;
  if (finalY < doc.internal.pageSize.getHeight() - 20) {
    doc.setFont('helvetica', 'bold');
    doc.text('Prepared By', 20, finalY);
    doc.text('Principal', doc.internal.pageSize.getWidth() - 40, finalY);
  }

  const now = new Date();
  addFooterToAllPages(doc, now.toLocaleDateString('en-GB'), now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`College_Overview_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ─────────────────────────────────────────────────────────────
// REPORT 3: Consolidated Unit / Internal Test Mark Statement - Format NAC/TLP-07a.20
// ─────────────────────────────────────────────────────────────
export const generateConsolidatedMarksPDF = async ({
  classObj, sessionLabel = 'internal1', subjects, students, allSessions, allAttendance, allMarks = [], allComponents = []
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  await drawCollegeHeader(doc, 'Consolidated Mark Statement', 'NAC/TLP-07a.20', '01', '', '1 of 1');

  let y = 46;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Year / Semester : ${classObj?.year_label || 'II'} / ${classObj?.semester || '4'}`, 14, y);
  doc.text(`Department      : ${classObj?.department || 'IT'}`, 120, y);
  y += 5;
  doc.text(`Internal Test   : ${sessionLabel === 'internal1' ? 'Internal Test 1 with Assignment' : 'Internal Test 2 with Assignment'}`, 14, y);
  doc.text(`Academic Year : 2026 - 2027`, 120, y);
  y += 5;
  doc.text(`Student Strength : ${students.length}`, 14, y);
  y += 6;

  // Remove Library
  const filteredSubjects = subjects.filter(s => s.code !== 'LIB' && s.name.toUpperCase() !== 'LIBRARY');

  // Subject Columns (up to 7 subjects)
  const targetSubjects = filteredSubjects.slice(0, 7);
  const subCols = targetSubjects.map(s => s.code);
  const headRow = ['Reg.No', 'Name', ...subCols, 'No.of Sub Failed', 'No. of sub Passed', 'No. of sub Absent'];

  // Map student rows
  const tableRows = students.map(st => {
    let failedCount = 0;
    let passedCount = 0;
    let absentCount = 0;

    const markCols = targetSubjects.map(sub => {
      const sess = allSessions.find(s => s.subject_id === sub.id);
      if (!sess) {
        absentCount++;
        return '-';
      }
      const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
      
      let score;
      if (is2021) {
        const sessionComps = allComponents.filter(c => c.session_id === sess.id);
        const studentMarks = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
        
        let rawCIA = 0;
        sessionComps.forEach((comp) => {
          const markObj = studentMarks.find(m => m.component_id === comp.id);
          const val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
          // Use conducted_max, fallback to max_marks, default to 100
          const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || 100;
          rawCIA += Math.min(val, conducted);
        });
        
        const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(sub.type);
        const ciaMax = isLabType ? 50 : 40;
        const examConvertedMax = isLabType ? 50 : 60;
        const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);

        const att = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        const examRaw = parseFloat(att?.internal_exam_mark) || 0;
        const examConverted = Math.round((examRaw / 100) * examConvertedMax);
        
        const labExamRaw = parseFloat(att?.lab_mark) || 0;
        const labExamConverted = Math.round((labExamRaw / 100) * 50);

        if (isLabType && sessionLabel === 'internal2') {
          score = Math.min(ciaTotal + labExamConverted, 100);
        } else {
          score = Math.min(ciaTotal + examConverted, 100);
        }
      } else {
        const att = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        if (!att || att.internal_exam_mark === null || att.internal_exam_mark === undefined || att.internal_exam_mark === '') {
          absentCount++;
          return 'AB';
        }
        score = parseFloat(att.internal_exam_mark);
      }

      if (isNaN(score) || score === null) {
        absentCount++;
        return 'AB';
      }
      const rounded = Math.round(score);
      if (rounded >= 50) passedCount++;
      else failedCount++;
      return rounded;
    });

    return [
      st.roll_no || st.rollNo || st.id,
      st.name,
      ...markCols,
      failedCount,
      passedCount,
      absentCount
    ];
  });

  // Calculate summary per subject (passed, failed, absent, pass %)
  const perSubjectPassed = [];
  const perSubjectFailed = [];
  const perSubjectAbsent = [];
  const perSubjectPassPct = [];

  targetSubjects.forEach(sub => {
    const sess = allSessions.find(s => s.subject_id === sub.id);
    let p = 0, f = 0, ab = 0;
    students.forEach(st => {
      if (!sess) {
        ab++;
        return;
      }
      const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
      
      let score;
      let isAbsent = false;
      
      if (is2021) {
        const sessionComps = allComponents.filter(c => c.session_id === sess.id);
        const studentMarks = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
        
        let rawCIA = 0;
        sessionComps.forEach((comp) => {
          const markObj = studentMarks.find(m => m.component_id === comp.id);
          const val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
          const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || 100;
          rawCIA += Math.min(val, conducted);
        });
        
        const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(sub.type);
        const ciaMax = isLabType ? 50 : 40;
        const examConvertedMax = isLabType ? 50 : 60;
        const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);

        const att = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        const examRaw = parseFloat(att?.internal_exam_mark) || 0;
        const examConverted = Math.round((examRaw / 100) * examConvertedMax);
        
        const labExamRaw = parseFloat(att?.lab_mark) || 0;
        const labExamConverted = Math.round((labExamRaw / 100) * 50);

        if (isLabType && sessionLabel === 'internal2') {
          score = Math.min(ciaTotal + labExamConverted, 100);
        } else {
          score = Math.min(ciaTotal + examConverted, 100);
        }
      } else {
        const att = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        if (!att || att.internal_exam_mark === null || att.internal_exam_mark === undefined || att.internal_exam_mark === '') {
          isAbsent = true;
        } else {
          score = parseFloat(att.internal_exam_mark);
          if (isNaN(score)) isAbsent = true;
        }
      }

      if (isAbsent || isNaN(score) || score === null) {
        ab++;
      } else if (score >= 50) {
        p++;
      } else {
        f++;
      }
    });
    perSubjectPassed.push(p);
    perSubjectFailed.push(f);
    perSubjectAbsent.push(ab);
    const totalAppeared = p + f;
    perSubjectPassPct.push(totalAppeared > 0 ? `${((p / totalAppeared) * 100).toFixed(1)}%` : '100%');
  });

  const footRows = [
    ['', 'No. of Students Passed', ...perSubjectPassed, '-', '-', '-'],
    ['', 'No. of Students Failed', ...perSubjectFailed, '-', '-', '-'],
    ['', 'No. of Students Absent', ...perSubjectAbsent, '-', '-', '-'],
    ['', 'Pass Percentage', ...perSubjectPassPct, '-', '-', '-']
  ];

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: tableRows,
    foot: footRows,
    theme: 'grid',
    styles: { fontSize: 7, halign: 'center', valign: 'middle' },
    headStyles: { fillColor: [240, 242, 245], textColor: [0,0,0], fontStyle: 'bold', fontSize: 7 },
    footStyles: { fillColor: [245, 247, 250], textColor: [0,0,0], fontStyle: 'bold', fontSize: 7, halign: 'center' },
    columnStyles: { 1: { halign: 'left', cellWidth: 32 } }
  });

  // Signatures (Class Incharge and HOD)
  y = doc.lastAutoTable.finalY + 18;
  if (y > 270) {
    doc.addPage();
    y = 30;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('CLASS IN-CHARGE', 24, y);
  doc.text('HOD', 160, y);

  const now = new Date();
  addFooterToAllPages(doc, now.toLocaleDateString('en-GB'), now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`${classObj?.name}_Consolidated_Mark_Statement.pdf`);
};

// ─────────────────────────────────────────────────────────────
// REPORT: 2021 Regulation — Subject Marks List (3rd & Final Year)
//
// Theory (Int1 & Int2):
//   S.No | Roll No | Name | CIA (/40) | Internal Exam (/100) | Converted (/60) | Total (/100)
//
// Lab-cum-Theory Int1:
//   S.No | Roll No | Name | CIA (/50) | Internal Exam (/100) | Converted (/50) | Total (/100)
//
// Lab-cum-Theory Int2:
//   S.No | Roll No | Name | CIA (/50) | Internal Exam (/100, ref) | Lab Exam (/100) | Lab Converted (/50) | Total (/100)
// ─────────────────────────────────────────────────────────────
export const generateSubjectMarksListPDF2021 = async ({
  subject, classObj, staff, session, students,
  marksData, attendanceData = {}, totalHours = 0, internalExamData, labData,
  assessmentMode, components
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  const isInternal2 = assessmentMode === 'internal2';
  const hasLab = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(subject?.type);
  const ciaMax = hasLab ? 50 : 40;
  const examConvertedMax = hasLab ? 50 : 60;
  const totHours = parseInt(totalHours || session?.total_hours || 0);

  const title = `${isInternal2 ? 'Internal Assessment 2' : 'Internal Assessment 1'} — Marks List (2021 Regulation)`;
  await drawCollegeHeader(doc, title, 'NAC/TLP-07a.21', '01', '', '1 of 1');

  let y = 46;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  // Info rows
  doc.text(`Year / Sem       : ${classObj?.year_label || 'III'} / ${classObj?.semester || '5'}`, 14, y);
  doc.text(`Dept                   : ${subject?.department || 'CSE'}`, 120, y);
  y += 5;
  doc.text(`Staff Name         : ${staff?.name || 'Faculty Staff'}`, 14, y);
  doc.text(`Academic Year  : 2026 - 2027`, 120, y);
  y += 5;
  doc.text(`Subject              : ${subject?.code} / ${subject?.name}`, 14, y);
  doc.text(`Date                  : ${new Date().toLocaleDateString('en-GB')}`, 120, y);
  y += 5;
  doc.text(`Calendar           : From Date: _________________    To Date: _________________`, 14, y);
  y += 5;
  doc.text(`Regulation         : Anna University 2021   |   Subject Type: ${subject?.type || 'Theory'}   |   Internal Marks Max: ${ciaMax}${totHours > 0 ? `   |   Total Classes: ${totHours}` : ''}`, 14, y);
  y += 6;

  // ── Build Table Header ──────────────────────────────────────
  const headRow = [
    'S.No',
    'Roll No',
    'Student Name',
    `Attendance\n(${totHours > 0 ? `/${totHours}` : 'Attd'})`,
    `Internal Marks\n(/${ciaMax})`
  ];

  if (isInternal2 && hasLab) {
    headRow.push(
      'Internal Exam\n(/100)',
      'Lab Exam\n(/100)',
      'Lab Converted\n(/50)',
      'CIA Mark\n(/100)'
    );
  } else {
    headRow.push(
      `Internal Exam\n(/100)`,
      `Converted\n(/${examConvertedMax})`,
      'CIA Mark\n(/100)'
    );
  }

  // ── Build Table Body ────────────────────────────────────────
  const bodyRows = students.map((student, idx) => {
    // Sum CIA components, cap at ciaMax
    let rawCIA = 0;
    components.forEach(c => {
      const val = parseFloat(marksData[student.id]?.[c.uid]) || 0;
      const conducted = parseFloat(c.conductedMax) || 100;
      rawCIA += Math.min(val, conducted);
    });
    const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);

    // Internal exam
    const examRaw = parseFloat(internalExamData[student.id]) || 0;
    const examConverted = Math.round((examRaw / 100) * examConvertedMax);

    // Lab exam (Int2 Lab-cum-Theory only)
    const labExamRaw = parseFloat(labData?.[student.id]?.labMark) || 0;
    const labExamConverted = Math.round((labExamRaw / 100) * 50);

    // Final total (Attendance does NOT affect final marks)
    let finalTotal;
    if (isInternal2 && hasLab) {
      finalTotal = Math.min(ciaTotal + labExamConverted, 100);
    } else {
      finalTotal = Math.min(ciaTotal + examConverted, 100);
    }

    const attdVal = attendanceData[student.id];
    let attdDisplay = '-';
    if (attdVal !== undefined && attdVal !== null && attdVal !== '') {
      attdDisplay = totHours > 0 ? `${attdVal}/${totHours}` : `${attdVal}`;
    }

    const row = [
      idx + 1,
      student.roll_no || student.rollNo || '-',
      student.name,
      attdDisplay,
      ciaTotal === 0 ? '-' : ciaTotal,
    ];

    if (isInternal2 && hasLab) {
      row.push(
        examRaw === 0 ? '-' : Math.round(examRaw),
        labExamRaw === 0 ? '-' : Math.round(labExamRaw),
        labExamConverted === 0 ? '-' : labExamConverted,
        finalTotal === 0 ? '-' : finalTotal
      );
    } else {
      row.push(
        examRaw === 0 ? '-' : Math.round(examRaw),
        examConverted === 0 ? '-' : examConverted,
        finalTotal === 0 ? '-' : finalTotal
      );
    }

    return row;
  });

  // Column widths
  const colStyles = {
    0: { cellWidth: 8 },
    1: { cellWidth: 26 },
    2: { cellWidth: 42, halign: 'left' },
    3: { cellWidth: 20 },
  };

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center', valign: 'middle' },
    headStyles: {
      fillColor: [124, 58, 237],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      cellPadding: 2,
    },
    alternateRowStyles: { fillColor: [248, 245, 255] },
    columnStyles: colStyles,
  });

  // Signatures
  y = doc.lastAutoTable.finalY + 18;
  if (y > 270) {
    doc.addPage();
    y = 30;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('STAFF INCHARGE', 20, y);
  doc.text('HOD', 170, y);

  const now = new Date();
  addFooterToAllPages(doc, now.toLocaleDateString('en-GB'), now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`${subject?.code}_2021Reg_${isInternal2 ? 'IA2' : 'IA1'}_Marks.pdf`);
};

// ─────────────────────────────────────────────────────────────
// REPORT: Continuous Assessment Analysis (Official Principal / VP Format)
// Matches CONTINUOUS ASSESSMENT ANALYSIS FORMAT.xlsx
// ─────────────────────────────────────────────────────────────
export const generateContinuousAssessmentAnalysisPDF = async ({
  caData, sessionLabel = 'internal1', user
}) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const isCA2 = sessionLabel === 'internal2';
  const title = `CONTINUOUS ASSESSMENT - ${isCA2 ? '2' : '1'} ANALYSIS`;

  await drawCollegeHeader(doc, title, 'NSCET/PRIN/CA-01', '01', null, '1 of 1');

  let y = 46;

  // Build table body with department spans
  const bodyRows = [];

  caData.departments.forEach((dept) => {
    dept.years.forEach((yr, idx) => {
      if (idx === 0) {
        bodyRows.push([
          { content: dept.department, rowSpan: dept.years.length, styles: { valign: 'middle', fontStyle: 'bold' } },
          yr.year,
          yr.strength,
          yr.passed,
          `${yr.percentage}%`,
          { content: `${dept.deptOverallPct}%`, rowSpan: dept.years.length, styles: { valign: 'middle', fontStyle: 'bold', halign: 'center' } }
        ]);
      } else {
        bodyRows.push([
          yr.year,
          yr.strength,
          yr.passed,
          `${yr.percentage}%`
        ]);
      }
    });
  });

  // Summary Row: Without First Year
  bodyRows.push([
    { content: 'Pass Percentage Without First Year', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
    { content: caData.summary.withoutFirstYear.strength, styles: { fontStyle: 'bold', fillColor: [240, 243, 248], halign: 'center' } },
    { content: caData.summary.withoutFirstYear.passed, styles: { fontStyle: 'bold', fillColor: [240, 243, 248], halign: 'center' } },
    { content: `${caData.summary.withoutFirstYear.percentage}%`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [240, 243, 248], halign: 'center' } }
  ]);

  // Summary Row: College Overall Pass Percentage
  bodyRows.push([
    { content: 'College Overall Pass Percentage', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [225, 235, 250], textColor: [128, 0, 0] } },
    { content: caData.summary.collegeOverall.strength, styles: { fontStyle: 'bold', fillColor: [225, 235, 250], textColor: [128, 0, 0], halign: 'center' } },
    { content: caData.summary.collegeOverall.passed, styles: { fontStyle: 'bold', fillColor: [225, 235, 250], textColor: [128, 0, 0], halign: 'center' } },
    { content: `${caData.summary.collegeOverall.percentage}%`, colSpan: 2, styles: { fontStyle: 'bold', fillColor: [225, 235, 250], textColor: [128, 0, 0], halign: 'center' } }
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Department', 'Year', 'Strength', 'Passed', 'Percentage', 'Percentage (Over all)']],
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 8, halign: 'center', cellPadding: 2 },
    headStyles: {
      fillColor: [128, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 38, halign: 'left' },
      1: { cellWidth: 16 },
      2: { cellWidth: 24 },
      3: { cellWidth: 24 },
      4: { cellWidth: 34 },
      5: { cellWidth: 44 }
    }
  });

  // Footer Signatures
  y = doc.lastAutoTable.finalY + 20;
  if (y > 270) {
    doc.addPage();
    y = 30;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VICE PRINCIPAL', 30, y);
  doc.text('PRINCIPAL', 160, y);

  const now = new Date();
  addFooterToAllPages(doc, now.toLocaleDateString('en-GB'), now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`NSCET_Continuous_Assessment_${isCA2 ? '2' : '1'}_Analysis.pdf`);
};

// ─────────────────────────────────────────────────────────────
// REPORT 4: Overall Marks & Attendance Statement (Based on Photo)
// ─────────────────────────────────────────────────────────────
export const generateOverallMarksAndAttendancePDF = async ({
  classObj, sessionLabel = 'internal1', subjects, students, allSessions, allAttendance, allMarks = [], allComponents = [], fromDate, toDate
}) => {
  // Landscape orientation to fit all columns
  const doc = new jsPDF('l', 'mm', 'a4');

  // Custom Simple Header
  const title = 'NADAR SARASWATHI COLLEGE OF ENGINEERING & TECHNOLOGY';
  const subtitle = '(Approved by AICTE-New Delhi & Affiliated to Anna University-Chennai)';
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(title, 148, 15, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, 148, 20, { align: 'center' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');

  doc.setFontSize(11);
  if (fromDate && toDate) {
    const fromStr = new Date(fromDate).toLocaleDateString('en-GB');
    const toStr = new Date(toDate).toLocaleDateString('en-GB');
    doc.text(`Student Attendance Details for the Period of ${fromStr} To ${toStr}`, 148, 28, { align: 'center' });
  } else {
    doc.text(`Student Attendance Details and Mark Statement as on ${dateStr}`, 148, 28, { align: 'center' });
  }

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const deptLabel = `Dept: ${classObj?.department || 'IT'}`;
  const secLabel = `Section: ${classObj?.section || 'A'}`;
  const semLabel = `Semester: ${classObj?.semester || '4'}`;
  
  doc.text(deptLabel, 80, 36);
  doc.text(secLabel, 130, 36);
  doc.text(semLabel, 180, 36);

  let y = 42;

  // Filter out library/seminar if they are not subjects
  const targetSubjects = subjects.filter(s => s.code !== 'LIB' && s.name.toUpperCase() !== 'LIBRARY');

  // Top header row
  const headRow1 = [
    { content: 'Sl.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Roll.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    { content: 'Student Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
  ];

  targetSubjects.forEach(sub => {
    headRow1.push({ content: sub.code, colSpan: 3, styles: { halign: 'center' } });
  });
  headRow1.push({ content: 'Over All', colSpan: 3, styles: { halign: 'center' } });

  // Second header row
  const headRow2 = [];
  targetSubjects.forEach(() => {
    headRow2.push('W.Hrs', 'P.Hrs', 'Marks');
  });
  headRow2.push('W.Hrs', 'P.Hrs', '(%)');

  const headRows = [headRow1, headRow2];

  const bodyRows = students.map((st, idx) => {
    let overallWHrs = 0;
    let overallPHrs = 0;
    
    const row = [
      idx + 1,
      st.roll_no || st.rollNo || st.id,
      st.name
    ];

    targetSubjects.forEach(sub => {
      const sess = allSessions.find(s => s.subject_id === sub.id);
      if (!sess) {
        row.push('0', '0', '-');
        return;
      }
      
      const att = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
      
      // Try to determine total hours
      const wHrs = parseInt(sess.total_hours) || parseInt(sess.int1_hours) || parseInt(sess.int2_hours) || 45;
      const pHrs = att ? (parseInt(att.hours_attended) || parseInt(att.attendance_days) || parseInt(att.lab_attendance) || 0) : 0;
      
      overallWHrs += wHrs;
      overallPHrs += pHrs;
      
      const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
      let score;
      if (is2021) {
        const sessionComps = allComponents.filter(c => c.session_id === sess.id);
        const studentMarks = allMarks.filter(m => m.session_id === sess.id && m.student_id === st.id);
        
        let rawCIA = 0;
        sessionComps.forEach((comp) => {
          const markObj = studentMarks.find(m => m.component_id === comp.id);
          const val = markObj ? parseFloat(markObj.marks_obtained) || 0 : 0;
          const conducted = parseFloat(comp.conducted_max) || parseFloat(comp.max_marks) || 100;
          rawCIA += Math.min(val, conducted);
        });
        
        const isLabType = ['Lab-cum-Theory', 'Theory-cum-Lab', 'Lab cum Theory', 'Theory cum Lab'].includes(sub.type);
        const ciaMax = isLabType ? 50 : 40;
        const examConvertedMax = isLabType ? 50 : 60;
        const ciaTotal = Math.min(Math.round(rawCIA), ciaMax);

        const examRaw = parseFloat(att?.internal_exam_mark) || 0;
        const examConverted = Math.round((examRaw / 100) * examConvertedMax);
        
        const labExamRaw = parseFloat(att?.lab_mark) || 0;
        const labExamConverted = Math.round((labExamRaw / 100) * 50);

        if (isLabType && sessionLabel === 'internal2') {
          score = Math.min(ciaTotal + labExamConverted, 100);
        } else {
          score = Math.min(ciaTotal + examConverted, 100);
        }
      } else {
        if (!att || att.internal_exam_mark === null || att.internal_exam_mark === undefined || att.internal_exam_mark === '') {
          score = null;
        } else {
          score = parseFloat(att.internal_exam_mark);
        }
      }

      const markStr = (score === null || isNaN(score)) ? 'AB' : Math.round(score);
      
      row.push(wHrs, pHrs, markStr);
    });

    const pct = overallWHrs > 0 ? Math.round((overallPHrs / overallWHrs) * 100) : 0;
    row.push(overallWHrs, overallPHrs, pct);
    
    return row;
  });

  autoTable(doc, {
    startY: y,
    head: headRows,
    body: bodyRows,
    theme: 'grid',
    styles: { fontSize: 7, halign: 'center', valign: 'middle', cellPadding: 1.5 },
    headStyles: { fillColor: [240, 242, 245], textColor: [0,0,0], fontStyle: 'bold', fontSize: 7, lineWidth: 0.1, lineColor: [0,0,0] },
    bodyStyles: { lineWidth: 0.1, lineColor: [0,0,0] },
    columnStyles: { 
      1: { halign: 'center', cellWidth: 20 },
      2: { halign: 'left', cellWidth: 35 } 
    }
  });

  y = doc.lastAutoTable.finalY + 12;
  if (y > 185) { // A4 landscape height is 210mm
    doc.addPage();
    y = 30;
  }

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('*** W.Hrs=Working Hours, P.Hrs=Present Hours, %=Attendance Percentage', 14, y);
  
  y += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Class Incharge', 20, y);
  doc.text('H.O.D', 110, y);
  doc.text('Principal', 220, y);
  doc.text('Signature of Faculty\\nwith date', 260, y, { align: 'center' });

  addFooterToAllPages(doc, dateStr, now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`${classObj?.name}_Overall_Mark_Statement.pdf`);
};

export const generateHodMarksPDF = async (department, sessionLabel, data) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  
  await drawCollegeHeader(doc, 'DEPARTMENT CONTINUOUS ASSESSMENT REPORT', 'NAC/TLP-XX', '01', dateStr, '01');

  let y = 45;
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`Department: ${department}`, 14, y);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const sessionName = sessionLabel === 'internal1' ? 'Internal Test 1 (CA-1)' : sessionLabel === 'internal2' ? 'Internal Test 2 (CA-2)' : 'Model Exam';
  doc.text(`Assessment Mode: ${sessionName}`, 140, y);
  y += 10;

  const tableBody = data.years.map(yData => [
    `${yData.year} Year (Sem ${yData.semester})`,
    yData.strength,
    yData.passed,
    `${yData.passPct}%`
  ]);

  tableBody.push([
    { content: 'OVERALL DEPARTMENT TOTAL', styles: { fontStyle: 'bold' } },
    { content: data.overall.strength, styles: { fontStyle: 'bold' } },
    { content: data.overall.passed, styles: { fontStyle: 'bold' } },
    { content: `${data.overall.passPct}%`, styles: { fontStyle: 'bold' } }
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Year / Semester', 'Total Students', 'Passed Students', 'Pass Percentage']],
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [40, 40, 40], textColor: 255, halign: 'center', fontSize: 10 },
    bodyStyles: { halign: 'center', fontSize: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: 14, right: 14 }
  });

  y = doc.lastAutoTable.finalY + 30;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('H.O.D', 40, y);
  doc.text('Principal', 160, y);

  addFooterToAllPages(doc, dateStr, now.toLocaleTimeString('en-GB', { hour12: false }));
  doc.save(`${department.replace(/\s+/g, '_')}_${sessionLabel}_Report.pdf`);
};

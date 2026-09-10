import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import db from './db.js';
import fs from 'fs';

const getHourSplits = (ltpc, type, total) => {
  const cleanLtpc = (ltpc || '').trim().replace(/-/g, '');
  const h = parseInt(total || 0);

  if (type === 'Lab-cum-Theory' || type === 'Theory-cum-Lab' || type === 'Lab cum Theory' || type === 'Theory cum Lab') {
    if (cleanLtpc === '2023') return { int1: 15, int2: 15, lab: 30 };
    if (cleanLtpc === '2043') return { int1: 15, int2: 15, lab: 60 };
    if (cleanLtpc === '1022') return { int1: 15, int2: 15, lab: 15 };
    if (cleanLtpc === '3024') return { int1: 30, int2: 30, lab: 15 };
    if (cleanLtpc === '3045') return { int1: 30, int2: 30, lab: 45 };
    if (cleanLtpc === '1021') return { int1: 15, int2: 15, lab: 15 };
    return { int1: 15, int2: 15, lab: Math.max(0, h - 30) };
  }

  if (type === 'Theory') {
    if (cleanLtpc === '3104' || cleanLtpc === '3004') return { int1: 30, int2: 30, lab: 0 };
    if (cleanLtpc === '1001') return { int1: 7, int2: 8, lab: 0 };
    if (cleanLtpc === '3003' || cleanLtpc === '2103') return { int1: 25, int2: 20, lab: 0 };
    if (cleanLtpc === '2002') return { int1: 15, int2: 15, lab: 0 };
  }

  if (type === 'Practical') {
    if (cleanLtpc === '0042') return { int1: 30, int2: 30, lab: 0 };
    if (cleanLtpc === '1021') return { int1: 25, int2: 20, lab: 0 };
    if (cleanLtpc === '0041') return { int1: 30, int2: 30, lab: 0 };
  }

  if (!h) return { int1: 0, int2: 0, lab: 0 };
  if (h === 60) return { int1: 30, int2: 30, lab: 0 };
  if (h === 45) return { int1: 25, int2: 20, lab: 0 };
  if (h === 30) return { int1: 15, int2: 15, lab: 0 };
  if (h === 15) return { int1: 7, int2: 8, lab: 0 };
  return { int1: Math.ceil(h / 2), int2: Math.floor(h / 2), lab: 0 };
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

async function generateTest() {
  const classId = 'CL001';
  const sessionLabel = 'internal1';
  const [clsRows] = await db.execute('SELECT * FROM classes WHERE id = ?', [classId]);
  const classObj = clsRows[0];
  const [subjects] = await db.execute('SELECT * FROM subjects WHERE class_id = ? ORDER BY code', [classId]);
  const [students] = await db.execute('SELECT id, s_no, roll_no, name FROM students WHERE class_id = ? ORDER BY s_no', [classId]);
  const [sessions] = await db.execute('SELECT * FROM marks_sessions WHERE class_id = ? AND session_label = ?', [classId, sessionLabel]);
  
  const sessionIds = sessions.map(s => s.id);
  let allAttendance = [];
  let allComponents = [];
  let allMarks = [];
  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => '?').join(',');
    [allAttendance] = await db.execute(`SELECT * FROM session_attendance WHERE session_id IN (${placeholders})`, sessionIds);
    [allComponents] = await db.execute(`SELECT * FROM assessment_components WHERE session_id IN (${placeholders})`, sessionIds);
    [allMarks] = await db.execute(`SELECT * FROM marks WHERE session_id IN (${placeholders})`, sessionIds);
  }

  const selectedSubjectIds = null;
  const fromDate = null;
  const toDate = null;

  try {
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
    doc.text(`Student Attendance Details and Mark Statement as on ${dateStr}`, 148, 28, { align: 'center' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const deptLabel = `Dept: ${classObj?.department || 'IT'}`;
    const secLabel = `Section: ${classObj?.section || 'A'}`;
    const semLabel = `Semester: ${classObj?.semester || '4'}`;
    
    doc.text(deptLabel, 80, 36);
    doc.text(secLabel, 130, 36);
    doc.text(semLabel, 180, 36);

    let y = 42;

    let targetSubjects = subjects.filter(s => s.code !== 'LIB' && s.name.toUpperCase() !== 'LIBRARY');
    
    const headRow1 = [
      { content: 'Sl.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Roll.No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Student Name', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
    ];

    targetSubjects.forEach(sub => {
      headRow1.push({ content: sub.code, colSpan: 3, styles: { halign: 'center' } });
    });
    headRow1.push({ content: 'Over All', colSpan: 3, styles: { halign: 'center' } });

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
        const sess = sessions.find(s => s.subject_id === sub.id);
        if (!sess) {
          row.push('0', '0', '-');
          return;
        }
        
        const att = allAttendance.find(a => a.session_id === sess.id && a.student_id === st.id);
        
        const subTotal = parseInt(sub.total_hours) || 60;
        const hourSplits = getHourSplits(sub.ltpc, sub.type, subTotal);
        
        let wHrs = 45;
        if (sessionLabel === 'internal1') {
          wHrs = hourSplits.int1 || Math.ceil(subTotal / 2);
        } else if (sessionLabel === 'internal2') {
          wHrs = hourSplits.int2 || Math.floor(subTotal / 2);
        } else {
          wHrs = subTotal;
        }

        const pHrs = att ? (parseInt(att.hours_attended) || parseInt(att.attendance_days) || parseInt(att.lab_attendance) || 0) : 0;
        
        overallWHrs += wHrs;
        overallPHrs += pHrs;
        
        const is2021 = classObj?.year_label === 'III' || classObj?.year_label === 'IV' || parseInt(classObj?.semester) >= 5;
        let score;
        if (is2021) {
          // not 2021 for CL001
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

      const pct = overallWHrs > 0 ? Math.min(100, Math.round((overallPHrs / overallWHrs) * 100)) : 0;
      row.push(overallWHrs, Math.min(overallPHrs, overallWHrs), pct);
      
      return row;
    });

    autoTable(doc, {
      startY: y,
      head: headRows,
      body: bodyRows,
      theme: 'grid',
      horizontalPageBreak: true,
      horizontalPageBreakRepeat: 0,
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
    const buffer = doc.output('arraybuffer');
    fs.writeFileSync('test.pdf', Buffer.from(buffer));
    console.log("PDF generated successfully");
  } catch (err) {
    console.error("PDF generation failed:", err);
  } finally {
    process.exit(0);
  }
}
generateTest();

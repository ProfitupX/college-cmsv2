import { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  BookOpen, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Award, 
  BookMarked,
  GraduationCap,
  Calendar,
  Layers,
  Sparkles,
  Loader
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { adminAPI } from '../../services/api';
import styles from './AdminPages.module.css';

export default function StaffClasses() {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');

  const loadData = () => {
    setLoading(true);
    adminAPI.getStaffClasses()
      .then((data) => setStaffList(data || []))
      .catch((err) => setError(err.message || 'Failed to load staff classes.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const unifiedStaffList = useMemo(() => {
    const map = new Map();

    staffList.forEach((st) => {
      let rawName = (st.name || '').toLowerCase().replace(/^(dr|mr|mrs|ms|prof)\.?\s*/i, '').trim();
      const tokens = rawName.split(/[\s\.\-_]+/).filter((t) => t.length > 0).sort().join('_');
      let emailPrefix = (st.email || '').toLowerCase().split('@')[0]
        .replace(/(\.it|\.cse|\.ece|\.mech|\.civil|\.eee|\.sh|\.aids|\.phy|\.chem|\.maths|\.eng|\.tamil|\.pd)$/i, '')
        .replace(/^[a-z][\._]/, '').replace(/[\._][a-z]$/, '')
        .replace(/[^a-z]/g, '');

      const key = (tokens && tokens.length >= 4) ? tokens : (emailPrefix || st.id);

      if (!map.has(key)) {
        map.set(key, {
          ...st,
          teachingSubjects: [...(st.teachingSubjects || [])],
          coordinatedClasses: [...(st.coordinatedClasses || [])]
        });
      } else {
        const existing = map.get(key);
        // Merge teaching subjects without duplicates
        (st.teachingSubjects || []).forEach((sub) => {
          if (!existing.teachingSubjects.some((s) => s.id === sub.id || (s.code === sub.code && s.class_id === sub.class_id))) {
            existing.teachingSubjects.push(sub);
          }
        });
        // Merge coordinated classes without duplicates
        (st.coordinatedClasses || []).forEach((cls) => {
          if (!existing.coordinatedClasses.some((c) => c.id === cls.id)) {
            existing.coordinatedClasses.push(cls);
          }
        });
        // Prefer official NSCET employee id, non-SH email, and HOD role
        if (st.employee_id && st.employee_id.startsWith('NSCET-')) existing.employee_id = st.employee_id;
        if (st.role === 'hod') existing.role = 'hod';
        if (st.email && !st.email.includes('.it@') && !st.email.includes('.sh@')) existing.email = st.email;
        if (st.designation && (!existing.designation || existing.designation === 'Faculty')) existing.designation = st.designation;
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [staffList]);

  const departments = useMemo(() => {
    const set = new Set();
    unifiedStaffList.forEach((st) => {
      if (st.department) set.add(st.department);
    });
    return Array.from(set).sort();
  }, [unifiedStaffList]);

  const filteredStaff = useMemo(() => {
    return unifiedStaffList.filter((st) => {
      const q = search.toLowerCase();
      const nameMatch = (st.name || '').toLowerCase().includes(q) ||
                        (st.email || '').toLowerCase().includes(q) ||
                        (st.employee_id || '').toLowerCase().includes(q);

      const subjectMatch = (st.teachingSubjects || []).some((s) => 
        (s.code || '').toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q) ||
        (s.class_name || '').toLowerCase().includes(q)
      );

      const classCoordMatch = (st.coordinatedClasses || []).some((c) =>
        (c.name || '').toLowerCase().includes(q)
      );

      const matchesSearch = !q || nameMatch || subjectMatch || classCoordMatch;

      const matchesDept = !deptFilter || st.department === deptFilter;

      let matchesYear = true;
      if (yearFilter) {
        const teachesYear = (st.teachingSubjects || []).some((s) => s.year_label === yearFilter);
        const coordsYear = (st.coordinatedClasses || []).some((c) => c.year_label === yearFilter);
        matchesYear = teachesYear || coordsYear;
      }

      return matchesSearch && matchesDept && matchesYear;
    }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [unifiedStaffList, search, deptFilter, yearFilter]);

  const stats = useMemo(() => {
    let totalSubs = 0;
    let totalCoords = 0;
    unifiedStaffList.forEach((st) => {
      totalSubs += (st.teachingSubjects || []).length;
      if ((st.coordinatedClasses || []).length > 0) totalCoords++;
    });
    return {
      totalStaff: unifiedStaffList.length,
      totalAllocatedSubjects: totalSubs,
      totalCoordinators: totalCoords,
    };
  }, [unifiedStaffList]);

  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Staff Allocations');

    // College Header Banner
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'NADAR SARASWATHI COLLEGE OF ENGINEERING & TECHNOLOGY, THENI';
    titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A8A' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 28;

    worksheet.mergeCells('A2:G2');
    const subCell = worksheet.getCell('A2');
    subCell.value = 'FACULTY & STAFF CLASS-WISE SUBJECT ALLOCATION DIRECTORY';
    subCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFF' } };
    subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } };
    subCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 22;

    const infoRow = worksheet.addRow([
      `Exported on: ${new Date().toLocaleDateString('en-GB')} | Total Faculty: ${stats.totalStaff} | Total Allocations: ${stats.totalAllocatedSubjects} | Class In-charges: ${stats.totalCoordinators}`
    ]);
    worksheet.mergeCells(`A3:G3`);
    infoRow.getCell(1).font = { name: 'Arial', size: 9, italic: true, color: { argb: '475569' } };
    infoRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    infoRow.height = 18;

    worksheet.addRow([]); // Blank spacer row

    const headers = [
      'S.No',
      'Faculty / Staff Name',
      'Designation & Department',
      'In-charge Roles',
      'Subject Code',
      'Subject Title',
      'Target Class & Sem'
    ];
    const headerRow = worksheet.addRow(headers);
    headerRow.height = 26;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        top: { style: 'thin', color: { argb: '94A3B8' } },
        bottom: { style: 'thin', color: { argb: '94A3B8' } },
        left: { style: 'thin', color: { argb: '94A3B8' } },
        right: { style: 'thin', color: { argb: '94A3B8' } }
      };
    });

    let sNo = 1;
    filteredStaff.forEach((st, staffIdx) => {
      const coordStr = (st.coordinatedClasses || []).map((c) => `${c.name} (${c.roleType})`).join('\n') || '— None —';
      const subs = st.teachingSubjects || [];
      const bgHex = staffIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';

      const startRowIdx = worksheet.lastRow.number + 1;

      if (subs.length === 0) {
        const row = worksheet.addRow([
          sNo++,
          st.name,
          `${st.designation || 'Faculty'} · ${st.department || '-'}`,
          coordStr,
          '—',
          'No Assigned Subjects',
          '—'
        ]);
        row.height = 26;
        row.eachCell((cell, colNum) => {
          cell.font = { name: 'Arial', size: 9, color: { argb: colNum === 6 ? '94A3B8' : '0F172A' }, bold: colNum === 2 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
          cell.alignment = { 
            vertical: 'middle', 
            wrapText: true, 
            horizontal: (colNum === 1 || colNum === 5) ? 'center' : 'left' 
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
            left: { style: 'thin', color: { argb: 'CBD5E1' } },
            right: { style: 'thin', color: { argb: 'CBD5E1' } }
          };
        });
      } else {
        subs.forEach((sub, subIdx) => {
          const row = worksheet.addRow([
            subIdx === 0 ? sNo : '',
            subIdx === 0 ? st.name : '',
            subIdx === 0 ? `${st.designation || 'Faculty'}\n${st.department || '-'}` : '',
            subIdx === 0 ? coordStr : '',
            sub.code,
            sub.name,
            `${sub.class_name || '-'}\n(Sem ${sub.semester || '-'})`
          ]);
          row.height = 26;
          row.eachCell((cell, colNum) => {
            cell.font = { 
              name: 'Arial', 
              size: 9, 
              color: { argb: colNum === 5 ? '3730A3' : '0F172A' },
              bold: colNum === 1 || colNum === 2 || colNum === 5
            };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
            cell.alignment = { 
              vertical: 'middle', 
              wrapText: true, 
              horizontal: (colNum === 1 || colNum === 5) ? 'center' : 'left' 
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'CBD5E1' } },
              bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
              left: { style: 'thin', color: { argb: 'CBD5E1' } },
              right: { style: 'thin', color: { argb: 'CBD5E1' } }
            };
          });
        });

        const endRowIdx = worksheet.lastRow.number;

        // Clean vertical merging for faculty details across all their subject rows
        if (subs.length > 1) {
          worksheet.mergeCells(`A${startRowIdx}:A${endRowIdx}`);
          worksheet.mergeCells(`B${startRowIdx}:B${endRowIdx}`);
          worksheet.mergeCells(`C${startRowIdx}:C${endRowIdx}`);
          worksheet.mergeCells(`D${startRowIdx}:D${endRowIdx}`);

          // Re-affirm alignment on merged cells
          ['A', 'B', 'C', 'D'].forEach((colLetter, cIdx) => {
            const cell = worksheet.getCell(`${colLetter}${startRowIdx}`);
            cell.alignment = { 
              vertical: 'middle', 
              wrapText: true, 
              horizontal: cIdx === 0 ? 'center' : 'left' 
            };
          });
        }

        sNo++;
      }
    });

    // Summary footer row
    worksheet.addRow([]);
    const summaryRowIdx = worksheet.lastRow.number + 1;
    const summaryRow = worksheet.addRow([
      `END OF DIRECTORY — Total Faculty Listed: ${filteredStaff.length} | Generated by NSCET Marks Hub`
    ]);
    worksheet.mergeCells(`A${summaryRowIdx}:G${summaryRowIdx}`);
    summaryRow.height = 24;
    summaryRow.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: '475569' } };
    summaryRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
    summaryRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.getCell(1).border = {
      top: { style: 'thin', color: { argb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
      left: { style: 'thin', color: { argb: 'CBD5E1' } },
      right: { style: 'thin', color: { argb: 'CBD5E1' } }
    };

    // Generous column widths so no text ever overlaps or clips
    worksheet.columns = [
      { width: 8 },  // A: S.No
      { width: 30 }, // B: Faculty / Staff Name
      { width: 34 }, // C: Designation & Department
      { width: 32 }, // D: In-charge Roles
      { width: 18 }, // E: Subject Code
      { width: 44 }, // F: Subject Title
      { width: 30 }  // G: Target Class & Sem
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NSCET_Staff_Class_Allocations_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className={styles.container}>
      {/* Page Title & Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className={styles.title} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookMarked size={28} color="var(--primary, #6366f1)" /> Staff Classes & Allocations
          </h1>
          <p className={styles.subtitle}>
            Comprehensive overview of which faculty and staff teach which classes and subjects across all years.
          </p>
        </div>
        <button
          onClick={handleExportExcel}
          className={styles.addBtn}
          style={{ background: '#10B981', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={18} /> Export Allocation Directory (.xlsx)
        </button>
      </div>

      {/* KPI Stats Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--card-bg, #ffffff)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', padding: '10px', borderRadius: '10px' }}>
              <Users size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Total Faculty</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>{stats.totalStaff}</h3>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #ffffff)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '10px', borderRadius: '10px' }}>
              <BookOpen size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Teaching Allocations</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>{stats.totalAllocatedSubjects}</h3>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--card-bg, #ffffff)', padding: '18px 20px', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '10px', borderRadius: '10px' }}>
              <Award size={22} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Class In-charges</p>
              <h3 style={{ margin: '4px 0 0', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary, #0f172a)' }}>{stats.totalCoordinators}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by faculty, subject, code, or class..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              background: 'var(--input-bg, #ffffff)',
              fontSize: '0.9rem',
              color: 'var(--text-primary, #1e293b)'
            }}
          />
        </div>

        <select
          value={deptFilter}
          onChange={(e) => setDeptFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'var(--input-bg, #ffffff)',
            fontSize: '0.9rem',
            color: 'var(--text-primary, #1e293b)'
          }}
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color, #cbd5e1)',
            background: 'var(--input-bg, #ffffff)',
            fontSize: '0.9rem',
            color: 'var(--text-primary, #1e293b)'
          }}
        >
          <option value="">All Academic Years</option>
          <option value="IV">IV Year (7th / 8th Sem)</option>
          <option value="III">III Year (5th / 6th Sem)</option>
          <option value="II">II Year (3rd / 4th Sem)</option>
          <option value="I">I Year (1st / 2nd Sem)</option>
        </select>
      </div>

      {/* Main Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted, #64748b)' }}>
          <Loader size={36} className={styles.spinner} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '14px', fontWeight: 500 }}>Loading staff class assignments...</p>
        </div>
      ) : error ? (
        <div className={styles.error} style={{ padding: '16px', borderRadius: '8px', background: '#fee2e2', color: '#b91c1c', marginBottom: '20px' }}>
          {error}
        </div>
      ) : filteredStaff.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <Users size={48} style={{ color: '#94a3b8', margin: '0 auto 12px' }} />
          <h3 style={{ margin: '0 0 6px', color: 'var(--text-primary, #1e293b)' }}>No staff allocations found</h3>
          <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>Try clearing your search or department filter.</p>
        </div>
      ) : (
        <div style={{ background: 'var(--card-bg, #ffffff)', borderRadius: '12px', border: '1px solid var(--border-color, #e2e8f0)', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', width: '60px', textAlign: 'center' }}>#</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', minWidth: '220px' }}>Faculty / Staff Details</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', minWidth: '180px' }}>In-charge Roles</th>
                  <th style={{ padding: '14px 16px', fontWeight: 600, color: '#475569', minWidth: '380px' }}>Assigned Subjects & Classes</th>
                </tr>
              </thead>
              <tbody>
                {filteredStaff.map((st, idx) => {
                  const subs = st.teachingSubjects || [];
                  const coords = st.coordinatedClasses || [];

                  return (
                    <tr 
                      key={st.id || idx} 
                      style={{ 
                        borderBottom: '1px solid #f1f5f9',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        verticalAlign: 'top'
                      }}
                    >
                      <td style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
                        {idx + 1}
                      </td>

                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>{st.name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '2px', fontWeight: 500 }}>
                          {st.designation || 'Faculty'} · {st.department || 'General'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                          {st.email} {st.employee_id && `· Emp: ${st.employee_id}`}
                        </div>
                      </td>

                      <td style={{ padding: '16px' }}>
                        {coords.length === 0 ? (
                          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>— None —</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {coords.map((c, cIdx) => (
                              <span 
                                key={cIdx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '0.78rem',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: c.roleType === 'Class In-charge' ? '#ecfdf5' : '#eff6ff',
                                  color: c.roleType === 'Class In-charge' ? '#065f46' : '#1e40af',
                                  border: `1px solid ${c.roleType === 'Class In-charge' ? '#a7f3d0' : '#bfdbfe'}`,
                                  fontWeight: 500,
                                  width: 'fit-content'
                                }}
                              >
                                <Award size={13} /> {c.name} ({c.roleType})
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '16px' }}>
                        {subs.length === 0 ? (
                          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic' }}>No classes assigned yet</span>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {subs.map((sub, sIdx) => (
                              <div
                                key={sIdx}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                                    <span style={{ color: '#4338ca', marginRight: '6px' }}>{sub.code}</span>
                                    {sub.name}
                                  </div>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    background: '#f1f5f9',
                                    color: '#475569'
                                  }}>
                                    {sub.type || 'Theory'}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 500, color: '#047857' }}>📌 Class: {sub.class_name || 'Assigned Class'}</span>
                                  <span>·</span>
                                  <span>Sem: {sub.semester}</span>
                                  <span>·</span>
                                  <span>LTPC: {sub.ltpc || '-'}</span>
                                  {sub.total_hours && (
                                    <>
                                      <span>·</span>
                                      <span>Total: {sub.total_hours} Hrs</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

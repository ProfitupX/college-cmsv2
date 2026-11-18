import { useState, useMemo } from 'react';
import { 
  Building, GraduationCap, Users, BookOpen, Layers, 
  Calendar, Award, ChevronRight, CheckCircle2, Clock, 
  Sparkles, AlertCircle, ArrowUpRight, X, Loader
} from 'lucide-react';
import { 
  UG_DEPARTMENTS, 
  PG_PROGRAMMES, 
  ACADEMIC_UNITS_METRICS,
  getPGProgrammeByClass,
  getPGProgrammeYearStatus,
  getPGProgrammeByOwningDepartment
} from '../../utils/academicProgrammes';
import { studentsAPI } from '../../services/api';
import styles from './AcademicUnitsManagement.module.css';

export default function AcademicUnitsManagement({ 
  classes = [], 
  subjects = [], 
  mode = 'principal', // 'principal' | 'hod'
  department = null,
  onSelectClass 
}) {
  const isHOD = mode === 'hod';
  const hodProgramme = useMemo(() => {
    if (!isHOD || !department) return null;
    return getPGProgrammeByOwningDepartment(department);
  }, [isHOD, department]);

  // If HOD mode and department has no PG programme (IT, AI&DS, EEE, S&H), render nothing
  if (isHOD && !hodProgramme) {
    return null;
  }

  const [activeTab, setActiveTab] = useState('pg'); // 'pg' or 'ug'
  const [selectedProgCode, setSelectedProgCode] = useState(
    isHOD && hodProgramme ? hodProgramme.code : 'ME_SE'
  );

  // Student list drill-down state
  const [selectedClassForStudents, setSelectedClassForStudents] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [studentListLoading, setStudentListLoading] = useState(false);

  // Compute live counts and class associations from props
  const ugDepartmentStats = useMemo(() => {
    return UG_DEPARTMENTS.map(dept => {
      const deptClasses = classes.filter(c => {
        const isPG = getPGProgrammeByClass(c);
        if (isPG) return false;
        const dName = String(c.department || '').toLowerCase();
        return (
          dName === dept.name.toLowerCase() ||
          dName === dept.shortName.toLowerCase() ||
          dName === dept.code.toLowerCase() ||
          (dept.code === 'SH' && (c.year_label === 'I' || dName.includes('science') || dName.includes('first year')))
        );
      });
      const studentCount = deptClasses.reduce((sum, c) => sum + (parseInt(c.student_count, 10) || 0), 0);
      return {
        ...dept,
        classes: deptClasses,
        classCount: deptClasses.length,
        studentCount
      };
    });
  }, [classes]);

  const pgProgrammeStats = useMemo(() => {
    return PG_PROGRAMMES.map(prog => {
      const progClasses = classes.filter(c => {
        const p = getPGProgrammeByClass(c);
        return p && p.code === prog.code;
      });
      const studentCount = progClasses.reduce((sum, c) => sum + (parseInt(c.student_count, 10) || 0), 0);
      return {
        ...prog,
        classes: progClasses,
        classCount: progClasses.length,
        studentCount
      };
    });
  }, [classes]);

  const selectedProgramme = useMemo(() => {
    if (isHOD && hodProgramme) {
      return pgProgrammeStats.find(p => p.code === hodProgramme.code) || hodProgramme;
    }
    return pgProgrammeStats.find(p => p.code === selectedProgCode) || pgProgrammeStats[0];
  }, [pgProgrammeStats, selectedProgCode, isHOD, hodProgramme]);

  const yearIStatus = useMemo(() => {
    if (!selectedProgramme) return null;
    return getPGProgrammeYearStatus(selectedProgramme.code, 'I', classes);
  }, [selectedProgramme, classes]);

  const yearIIStatus = useMemo(() => {
    if (!selectedProgramme) return null;
    return getPGProgrammeYearStatus(selectedProgramme.code, 'II', classes);
  }, [selectedProgramme, classes]);

  const getSubjectsForClass = (classId) => {
    if (!Array.isArray(subjects) || subjects.length === 0) return [];
    return subjects.filter(s => String(s.class_id) === String(classId));
  };

  const handleOpenStudentList = async (cls) => {
    setSelectedClassForStudents(cls);
    setStudentListLoading(true);
    try {
      const res = await studentsAPI.getByClass(cls.id);
      setStudentList(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load students for class:', err);
      setStudentList([]);
    } finally {
      setStudentListLoading(false);
    }
  };

  const handleCloseStudentList = () => {
    setSelectedClassForStudents(null);
    setStudentList([]);
  };

  return (
    <div className={styles.wrapper}>
      {/* 1. Academic Structure Header Strip */}
      <div className={styles.headerStrip}>
        <div className={styles.headerInfo}>
          <div className={styles.titleRow}>
            <Layers size={22} color="var(--primary)" />
            <h2 className={styles.title}>
              {isHOD 
                ? `Department Postgraduate Programme: ${selectedProgramme?.name}` 
                : 'Academic Units Management'}
            </h2>
          </div>
          <p className={styles.subtitle}>
            {isHOD
              ? `Anna University M.E. PG Regulation 2025 · Owning Department: ${selectedProgramme?.owningDepartment}`
              : 'Independent Governance for 8 Undergraduate Departments and 4 Postgraduate Programmes'}
          </p>
        </div>

        {/* 12 Academic Units KPI Pill Strip (or HOD Programme summary) */}
        {!isHOD ? (
          <div className={styles.kpiPills}>
            <div className={styles.kpiPill}>
              <Building size={16} color="#2563EB" />
              <span className={styles.kpiLabel}>UG Departments:</span>
              <strong className={styles.kpiValue}>{ACADEMIC_UNITS_METRICS.ugDepartmentsCount}</strong>
            </div>
            <div className={styles.kpiPill}>
              <GraduationCap size={18} color="#7C3AED" />
              <span className={styles.kpiLabel}>PG Programmes:</span>
              <strong className={styles.kpiValue}>{ACADEMIC_UNITS_METRICS.pgProgrammesCount}</strong>
            </div>
            <div className={`${styles.kpiPill} ${styles.kpiTotal}`}>
              <Award size={18} color="#059669" />
              <span className={styles.kpiLabel}>Total Academic Units:</span>
              <strong className={styles.kpiValueTotal}>{ACADEMIC_UNITS_METRICS.totalAcademicUnits}</strong>
            </div>
          </div>
        ) : (
          <div className={styles.kpiPills}>
            <div className={styles.kpiPill}>
              <Users size={16} color="#7C3AED" />
              <span className={styles.kpiLabel}>PG Student Strength:</span>
              <strong className={styles.kpiValue}>{selectedProgramme?.studentCount || 0}</strong>
            </div>
            <div className={styles.kpiPill}>
              <BookOpen size={16} color="#2563EB" />
              <span className={styles.kpiLabel}>Active Classes:</span>
              <strong className={styles.kpiValue}>{selectedProgramme?.classCount || 0}</strong>
            </div>
            <div className={`${styles.kpiPill} ${styles.kpiTotal}`}>
              <Calendar size={16} color="#059669" />
              <span className={styles.kpiLabel}>Duration:</span>
              <strong className={styles.kpiValueTotal}>2 Years · 4 Semesters</strong>
            </div>
          </div>
        )}
      </div>

      {/* 2. Primary Tabs: Only shown on Principal Dashboard */}
      {!isHOD && (
        <div className={styles.tabNav}>
          <button
            type="button"
            onClick={() => setActiveTab('pg')}
            className={`${styles.tabBtn} ${activeTab === 'pg' ? styles.tabBtnActivePg : ''}`}
          >
            <GraduationCap size={18} />
            PG Programmes ({ACADEMIC_UNITS_METRICS.pgProgrammesCount})
            <span className={styles.regBadge}>Anna University R2025</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ug')}
            className={`${styles.tabBtn} ${activeTab === 'ug' ? styles.tabBtnActiveUg : ''}`}
          >
            <Building size={18} />
            UG Departments ({ACADEMIC_UNITS_METRICS.ugDepartmentsCount})
          </button>
        </div>
      )}

      {/* 3. PG Programmes Panel (Principal or HOD Mode) */}
      {(activeTab === 'pg' || isHOD) && (
        <div className={styles.panelContent}>
          {/* 4 PG Programmes Selection Bar (Hidden in HOD mode since HOD owns only 1) */}
          {!isHOD && (
            <div className={styles.programmeGrid}>
              {pgProgrammeStats.map(prog => {
                const isSelected = prog.code === selectedProgCode;
                return (
                  <div
                    key={prog.code}
                    onClick={() => setSelectedProgCode(prog.code)}
                    className={`${styles.progCard} ${isSelected ? styles.progCardSelected : ''}`}
                    style={{ borderLeftColor: prog.color }}
                  >
                    <div className={styles.progCardTop}>
                      <span className={styles.progIcon}>{prog.icon}</span>
                      <span className={styles.progLevelBadge}>{prog.degreeTitle} · {prog.degreeLevel}</span>
                    </div>
                    <h3 className={styles.progName}>{prog.name}</h3>
                    <div className={styles.progMeta}>
                      <span>Owning Dept: <strong>{prog.owningDepartment}</strong></span>
                    </div>
                    <div className={styles.progFooter}>
                      <span>Active Classes: <strong>{prog.classCount}</strong></span>
                      <span>Students: <strong>{prog.studentCount}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Drill-down view for Selected PG Programme */}
          {selectedProgramme && (
            <div className={styles.drilldownSection}>
              <div className={styles.drilldownHeader}>
                <div>
                  <div className={styles.drilldownTag}>
                    <span>Postgraduate Programme</span>
                    <span className={styles.dot}>·</span>
                    <span>Regulation: <strong>Anna University R2025</strong></span>
                    <span className={styles.dot}>·</span>
                    <span>Owning Dept: <strong>{selectedProgramme.owningDepartment}</strong></span>
                  </div>
                  <h3 className={styles.drilldownTitle}>{selectedProgramme.name} ({selectedProgramme.code})</h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div className={styles.durationPill}>
                    <Calendar size={15} /> 2 Years · 4 Semesters
                  </div>
                  <div style={{
                    fontSize: '0.75rem', fontWeight: 700, padding: '4px 10px',
                    borderRadius: '16px', background: 'rgba(217, 119, 6, 0.1)', color: '#d97706',
                    border: '1px solid rgba(217, 119, 6, 0.25)'
                  }}>
                    Result Status: Awaiting Marks
                  </div>
                </div>
              </div>

              {/* Year & Semester Grid: Year I & Year II */}
              <div className={styles.yearGrid}>
                {/* Year I Box */}
                <div className={styles.yearBox}>
                  <div className={styles.yearBoxHeader}>
                    <div>
                      <h4 className={styles.yearTitle}>Year I (Semesters I &amp; II)</h4>
                      <p className={styles.yearBatch}>Academic Batch: {yearIStatus?.academicBatch}</p>
                    </div>
                    {yearIStatus?.hasActiveClasses ? (
                      <span className={styles.activeBatchBadge}>
                        <CheckCircle2 size={13} /> Active ({yearIStatus.studentCount} Students)
                      </span>
                    ) : (
                      <span className={styles.futureBatchBadge}>
                        <Clock size={13} /> Future Batch (0 Students)
                      </span>
                    )}
                  </div>

                  <div className={styles.semChips}>
                    <span className={styles.semChip} style={{ borderLeft: '3px solid #2563EB' }}>
                      Semester I {yearIStatus?.hasActiveClasses ? '· Active' : '· Future Batch'}
                    </span>
                    <span className={styles.semChip} style={{ opacity: 0.75 }}>
                      Semester II · Future Batch (0 Students)
                    </span>
                  </div>

                  <div className={styles.classSection}>
                    <h5 className={styles.sectionSubtitle}>Associated Classes:</h5>
                    {yearIStatus?.classes && yearIStatus.classes.length > 0 ? (
                      yearIStatus.classes.map(cls => (
                        <div key={cls.id} className={styles.classCard}>
                          <div className={styles.classCardHeader}>
                            <strong>{cls.name}</strong>
                            <span className={styles.classIdBadge}>{cls.id}</span>
                          </div>
                          <div className={styles.classDetails}>
                            <span>Semester: <strong>{cls.semester}</strong></span>
                            <span>Students: <strong>{cls.student_count || 0}</strong></span>
                            {cls.class_coordinator && <span>Coordinator: <strong>{cls.class_coordinator}</strong></span>}
                          </div>
                          {/* Subject list if available */}
                          {getSubjectsForClass(cls.id).length > 0 && (
                            <div className={styles.subList}>
                              <span className={styles.subListLabel}>Subjects:</span>
                              {getSubjectsForClass(cls.id).map(s => (
                                <span key={s.id} className={styles.subjectTag}>
                                  {s.code} - {s.name} ({s.type})
                                </span>
                              ))}
                            </div>
                          )}

                          {/* 5-Level Drill-Down: View Student List Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStudentList(cls)}
                            className={styles.viewStudentsBtn}
                          >
                            <Users size={13} /> View Student List ({cls.student_count || 0})
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptyClassNotice}>
                        <AlertCircle size={16} />
                        <span>No classes enrolled yet for this batch. Class records will appear once created.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Year II Box */}
                <div className={styles.yearBox}>
                  <div className={styles.yearBoxHeader}>
                    <div>
                      <h4 className={styles.yearTitle}>Year II (Semesters III &amp; IV)</h4>
                      <p className={styles.yearBatch}>Academic Batch: {yearIIStatus?.academicBatch}</p>
                    </div>
                    {yearIIStatus?.hasActiveClasses ? (
                      <span className={styles.activeBatchBadge}>
                        <CheckCircle2 size={13} /> Active ({yearIIStatus.studentCount} Students)
                      </span>
                    ) : (
                      <span className={styles.futureBatchBadge}>
                        <Clock size={13} /> Future Batch (0 Students)
                      </span>
                    )}
                  </div>

                  <div className={styles.semChips}>
                    <span className={styles.semChip} style={{ borderLeft: '3px solid #7C3AED' }}>
                      Semester III {yearIIStatus?.hasActiveClasses ? '· Active' : '· Future Batch'}
                    </span>
                    <span className={styles.semChip} style={{ opacity: 0.75 }}>
                      Semester IV (Project Phase II) · Future Batch (0 Students)
                    </span>
                  </div>

                  <div className={styles.classSection}>
                    <h5 className={styles.sectionSubtitle}>Associated Classes:</h5>
                    {yearIIStatus?.classes && yearIIStatus.classes.length > 0 ? (
                      yearIIStatus.classes.map(cls => (
                        <div key={cls.id} className={styles.classCard}>
                          <div className={styles.classCardHeader}>
                            <strong>{cls.name}</strong>
                            <span className={styles.classIdBadge}>{cls.id}</span>
                          </div>
                          <div className={styles.classDetails}>
                            <span>Semester: <strong>{cls.semester}</strong></span>
                            <span>Students: <strong>{cls.student_count || 0}</strong></span>
                            {cls.class_coordinator && <span>Coordinator: <strong>{cls.class_coordinator}</strong></span>}
                          </div>
                          {getSubjectsForClass(cls.id).length > 0 && (
                            <div className={styles.subList}>
                              <span className={styles.subListLabel}>Subjects:</span>
                              {getSubjectsForClass(cls.id).map(s => (
                                <span key={s.id} className={styles.subjectTag}>
                                  {s.code} - {s.name} ({s.type})
                                </span>
                              ))}
                            </div>
                          )}

                          {/* 5-Level Drill-Down: View Student List Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenStudentList(cls)}
                            className={styles.viewStudentsBtn}
                          >
                            <Users size={13} /> View Student List ({cls.student_count || 0})
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className={styles.emptyClassNotice}>
                        <AlertCircle size={16} />
                        <span>No classes enrolled yet for Year II. This programme supports II Year progression for future cohorts.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. UG Departments Panel (Principal Only) */}
      {!isHOD && activeTab === 'ug' && (
        <div className={styles.panelContent}>
          <div className={styles.deptGrid}>
            {ugDepartmentStats.map(dept => (
              <div 
                key={dept.code} 
                className={styles.deptCard}
                style={{ borderTopColor: dept.color }}
              >
                <div className={styles.deptCardTop}>
                  <span className={styles.deptIcon}>{dept.icon}</span>
                  <span className={styles.deptDegreeBadge}>{dept.degreeTitle}</span>
                </div>
                <h3 className={styles.deptName}>{dept.name}</h3>
                <div className={styles.deptMeta}>
                  <span>Duration: <strong>{dept.durationYears} Years · {dept.totalSemesters} Sems</strong></span>
                  <span>Classes: <strong>{dept.classCount}</strong></span>
                  <span>Students: <strong>{dept.studentCount}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Hierarchical Drill-Down: Student List Modal Drawer */}
      {selectedClassForStudents && (
        <div className={styles.modalOverlay} onClick={handleCloseStudentList}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>
                  Enrolled Students: {selectedClassForStudents.name}
                </h3>
                <p className={styles.modalSubTitle}>
                  Class ID: {selectedClassForStudents.id} · Semester {selectedClassForStudents.semester} · Anna University R2025
                </p>
              </div>
              <button 
                type="button" 
                onClick={handleCloseStudentList}
                className={styles.modalCloseBtn}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {studentsLoading ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <Loader size={20} className="spin" style={{ display: 'inline-block', marginRight: '8px' }} />
                  Loading student roster...
                </div>
              ) : studentList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No students currently enrolled in this class.
                </div>
              ) : (
                <table className={styles.studentTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>#</th>
                      <th>Student Name</th>
                      <th>Register Number / ID</th>
                      <th>Class ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentList.map((stu, idx) => (
                      <tr key={stu.id || idx}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td><strong>{stu.name}</strong></td>
                        <td>{stu.roll_no || stu.register_number || stu.id}</td>
                        <td><code>{selectedClassForStudents.id}</code></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

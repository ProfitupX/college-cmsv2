# SYSTEM PROMPT & ARCHITECTURE: NSCET-MarkHub

Centralized Academic Mark Entry & Management System designed for Nadar Saraswathi College of Engineering and Technology (NSCET), Vadapudupatti, Theni, affiliated with Anna University, Chennai.

---

## 1. INSTITUTIONAL STRUCTURE & REGULATIONS

### Academic Regulations:
1. **Regulation 2025 (Autonomous / CBCS)**:
   - Applies to **I Year** and **II Year** batches.
   - Strict Continuous Internal Assessment (CIA), Theory Cum Lab combined weightages, Makerspace practicals, and automated hour splits based on LTPC.
2. **Regulation 2021 (Anna University Affiliated)**:
   - Applies to **III Year** and **IV Year** senior batches.

### Departments:
- **First Year Umbrella Department**: `Science and Humanities` (S & H)
  - **HoD**: Dr. C. Chithra (`Prof./Maths`, Employee ID: `SH001`, Email: `c.chithra@nscet.org`).
  - All 1st-year classes (`2026–2030 Batch`) are housed under `Science and Humanities`.
  - Classrooms:
    - `C_SH_CSE_A_1` (I Year CSE A) - 60 Students
    - `C_SH_CSE_B_1` (I Year CSE B) - 33 Students
    - `C_SH_IT_1` (I Year IT) - 39 Students
    - `C_SH_AIDS_1` (I Year AI & DS) - 49 Students
    - `C_SH_ECE_1` (I Year ECE) - 52 Students
    - `C_SH_EEE_1` (I Year EEE) - 23 Students
    - `C_SH_CIVIL_1` (I Year Civil) - 36 Students
    - `C_SH_MECH_1` (I Year Mech) - 40 Students
  - Faculty teaching S&H subjects retain their parent core departments (e.g., Mechanical faculty teaching Engineering Drawing retain department = "Mechanical Engineering").
- **Core Engineering Departments**:
  - Computer Science and Engineering (CSE)
  - Information Technology (IT)
  - Artificial Intelligence and Data Science (AI & DS)
  - Electronics and Communication Engineering (ECE)
  - Electrical and Electronics Engineering (EEE)
  - Civil Engineering
  - Mechanical Engineering

---

## 2. USER ROLES & PERMISSION MATRIX

| Role | Permissions & Scope |
| :--- | :--- |
| **`admin`** | Full access to master data (Classes, Subjects, Staff, Students), system settings, assessment deadlines, and audit logs. |
| **`principal`** | Institution-wide executive view: cross-department pass percentages, consolidated analytics, final mark approvals, and institutional reports. |
| **`hod`** | Department-level administration: monitors faculty mark entry, reviews submitted CIA marks, approves marks or requests revisions, and tracks departmental performance. |
| **`class_coordinator`** | Classroom-level manager: views complete multi-subject consolidated marks for their specific section, identifies slow learners, and generates class reports. |
| **`faculty`** | Subject-level teacher: enters marks, attendance, internal assessment scores, lab marks, and remedial plans for their assigned subject(s). Submits marks to HoD. |

---

## 3. MARK ENTRY & ASSESSMENT MODES

### Subject Categories & Splitting Rules:
1. **Theory**: Continuous assessments (CAT-1, CAT-2, Assignments/Seminars) + Semester Conversion.
2. **Theory Cum Lab**: Split into **Theory Component** and **Lab Component**. Theory test marks + practical lab assessment marks calculated concurrently.
3. **Practical**: Continuous laboratory assessment (Observation, Model Practical, Record, Viva Voce).

### LTPC & Hour Splits:
Hour splits are automatically calculated from LTPC codes:
- `3 0 0 3` (45 Hours) -> Internal 1: 25 hrs, Internal 2: 20 hrs.
- `3 0 2 4` -> Theory: 45 hrs, Lab: 30 hrs.
- `0 0 4 2` -> Lab: 60 hrs.

### Dynamic Assessment Component Builder:
Faculty configure customized assessment components per session:
- **`conductedMax`**: Maximum marks the test was conducted for (e.g., 50 or 100).
- **`maxMarks`**: Scaled/converted marks contributing to internal calculation (e.g., 15, 20, 30).
- Formula: $\text{Scaled Mark} = \left(\frac{\text{Obtained}}{\text{Conducted}}\right) \times \text{Converted Max}$.

---

## 4. LIFECYCLE & APPROVAL WORKFLOW

1. **Draft (`draft`)**: Faculty can freely enter and update marks.
2. **Submitted / Frozen (`locked`)**: Marks locked; notification dispatched to HoD.
3. **Unlock Request (`unlock_requested`)**: Faculty submits formal justification; HoD/Admin approves unlock to revert status to `draft`.
4. **HoD Approved (`approved_by_hod`)**: Marks verified against scheme; escalated to Principal.
5. **Published / Finalized (`published`)**: Fully certified and locked for Anna University submission.

---

## 5. REPORT & PDF GENERATION STANDARDS

All exported PDFs strictly comply with ISO 9001:2015 institutional format standards:
- **Format Code**: `NAC/TLP-07a.25` (Regulation 2025) and `NAC/TLP-07a.21` (Regulation 2021).
- **Metadata**: Rev No (01/02), Date, Page Numbering.
- **Branding**: Official Nadar Saraswathi College of Engineering & Technology logo, accreditation line (NAAC 'A' Grade, ISO certified, Vadapudupatti, Theni).
- **Reports**: Subject Analysis Report, Class-wise Consolidated Mark Sheet, CIA Assessment Analysis with pass percentage, class average, high/low scoring statistics, and remedial action plans for slow learners (< 50%).

---

## 6. UI NAVIGATION & FILTERING HIERARCHY

Admin toolbar nested dropdowns:
- Department: "Science and Humanities" -> Branch (CSE, IT, AI & DS, ECE, EEE, Civil, Mech).
- When CSE selected -> Section (All Sections, Section A, Section B).
- Other Departments: Semester Filter (Sem 1 to Sem 8).

# Project Agents & Background Process Guidelines

- **Task Hygiene**:
  - All test scripts, verification runs, and database queries must terminate promptly and cleanly with `process.exit(0)`.
  - Background processes must never run unattended overnight.
  - Check `manage_task` to ensure zero stale tasks exist before concluding interactions.

# Task Management & Background Process Rules

1. **Immediate Exit for Node Scripts**:
   - Every ad-hoc Node.js script or diagnostic query MUST explicitly call `process.exit(0)` and terminate active connections (e.g., `await db.end()`).
   - Use `node scripts/db_query.js "<SQL>"` for database queries to guarantee instant, clean termination within 2 seconds.

2. **No Lingering Background Tasks**:
   - Never allow one-off commands to fall into the background as long-running tasks.
   - For commands run with `run_command`, always use `WaitMsBeforeAsync: 8000` to `10000` so commands finish synchronously.
   - If an async task is launched, inspect its completion and kill it immediately using `manage_task(Action='kill')` when done.
   - At the end of every turn, ensure `manage_task(Action='list')` has 0 running tasks unless a persistent dev server is explicitly requested.

3. **Prompt Execution Safety**:
   - Zero background tasks must remain active overnight or between user prompts.

// Centralized Exception Logger for Production Safety System
// Requirement 4: Log all exceptions with module name, user role, and stack trace

export async function logException({
  moduleName = 'General',
  userRole = 'unknown',
  userName = '',
  userId = '',
  error = null,
  errorInfo = null,
  url = typeof window !== 'undefined' ? window.location.href : '',
}) {
  try {
    const errorMessage = error?.message || (typeof error === 'string' ? error : 'Unknown runtime exception');
    const stackTrace = error?.stack || errorInfo?.componentStack || (typeof errorInfo === 'string' ? errorInfo : '');

    // Always output to console for immediate developer visibility
    console.error(`🚨 [Production Exception Logger] [${moduleName}] (${userRole}):`, errorMessage, {
      stackTrace,
      url,
      userId,
      userName
    });

    const payload = {
      module_name: moduleName,
      user_role: userRole,
      user_name: userName,
      user_id: userId,
      error_message: errorMessage,
      stack_trace: stackTrace,
      url: url || (typeof window !== 'undefined' ? window.location.href : ''),
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
    };

    // Dispatch to backend API fail-safe
    if (typeof fetch !== 'undefined') {
      await fetch('/api/logs/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch((fetchErr) => {
        console.warn('⚠️ Exception logging endpoint unreachable:', fetchErr.message);
      });
    }
  } catch (loggingErr) {
    // Failsafe: logger must never throw or break caller
    console.error('⚠️ Critical failure inside logException:', loggingErr);
  }
}

export default logException;

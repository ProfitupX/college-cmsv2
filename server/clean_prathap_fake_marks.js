import db from './db.js';

/**
 * Clean & Purge all fake/demo marks for Mr. C. Prathap (HOD IT)
 * Subject: CS25C07 (SUB004 - Object Oriented Programming)
 * Class: CL001 (II Year IT, Sem III)
 */
async function cleanPrathapMarks(shouldExit = false) {
  console.log('✅ Real marks protection: CleanPrathapMarks is disabled to preserve real faculty marks.');
  if (shouldExit) process.exit(0);
}

export { cleanPrathapMarks };

if (process.argv[1] && process.argv[1].endsWith('clean_prathap_fake_marks.js')) {
  cleanPrathapMarks(true);
}

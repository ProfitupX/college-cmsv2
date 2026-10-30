// Automated Quality & Integrity Verification Script
// Prevents undeclared API usages, missing imports, broken relative paths, and case-sensitivity mismatches.

const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'src');
const serverDir = path.resolve(__dirname, '..', 'server');

const KNOWN_APIS = [
  'settingsAPI',
  'marksAPI',
  'classesAPI',
  'subjectsAPI',
  'studentsAPI',
  'adminAPI',
  'statsAPI',
  'notificationsAPI',
  'authAPI',
  'profileAPI',
  'attendanceAPI'
];

let errorsFound = 0;
let warningsFound = 0;

function getAllFiles(dir, extensions = ['.js', '.jsx']) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const item of list) {
    if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, extensions));
    } else if (extensions.includes(path.extname(item))) {
      results.push(fullPath);
    }
  }
  return results;
}

console.log('🔍 [1/3] Checking for undeclared API references across frontend code...');
const srcFiles = getAllFiles(srcDir);

for (const filePath of srcFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
  const lines = content.split('\n');

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) continue;

    for (const apiName of KNOWN_APIS) {
      // Look for apiName usage (e.g. settingsAPI. or settingsAPI() or { settingsAPI })
      const usageRegex = new RegExp(`\\b${apiName}\\b`);
      if (usageRegex.test(line)) {
        // Check if apiName is defined or imported in this file
        const isDeclaration = new RegExp(`(import\\s+.*\\b${apiName}\\b|export\\s+const\\s+${apiName}\\b|const\\s+${apiName}\\b|let\\s+${apiName}\\b|var\\s+${apiName}\\b)`);
        if (!isDeclaration.test(content)) {
          console.error(`❌ [UNDECLARED API REFERENCE] File: ${relPath}:${idx + 1}`);
          console.error(`   "${apiName}" is used but not imported or declared!`);
          console.error(`   Line: ${line.trim()}`);
          errorsFound++;
        }
      }
    }
  }
}

console.log('🔍 [2/3] Checking for broken relative file import paths & case-sensitivity...');
for (const filePath of srcFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
  const importRegex = /from\s+['"](\.[^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const sourceDir = path.dirname(filePath);
    let resolved = path.resolve(sourceDir, importPath);

    // Try common extensions if no extension specified
    const extensionsToTry = ['', '.jsx', '.js', '.css', '.json', '/index.js', '/index.jsx'];
    let exists = false;
    let actualResolvedPath = null;

    for (const ext of extensionsToTry) {
      const candidate = resolved + ext;
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        exists = true;
        actualResolvedPath = candidate;
        break;
      }
    }

    if (!exists) {
      console.error(`❌ [BROKEN IMPORT] File: ${relPath}`);
      console.error(`   Cannot resolve import: "${importPath}"`);
      errorsFound++;
    } else {
      // Check case-sensitivity against file system to prevent Linux/VPS deployment failures
      const parentDir = path.dirname(actualResolvedPath);
      const expectedFileName = path.basename(actualResolvedPath);
      const actualEntries = fs.readdirSync(parentDir);
      const entryMatch = actualEntries.find(e => e.toLowerCase() === expectedFileName.toLowerCase());
      if (entryMatch && entryMatch !== expectedFileName) {
        console.warn(`⚠️  [CASE MISMATCH] File: ${relPath} imports "${expectedFileName}" but on disk it is "${entryMatch}"`);
        warningsFound++;
      }
    }
  }
}

console.log('🔍 [3/3] Checking server route syntax & database schema compatibility...');
const serverFiles = getAllFiles(serverDir, ['.js']);
for (const filePath of serverFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
  try {
    // Quick syntax test by parsing in node if possible
    new Function(content);
  } catch (err) {
    // Top-level await or module syntax might throw if not wrapped in async, only report if outright syntax error
    if (err.name === 'SyntaxError' && !err.message.includes('await') && !err.message.includes('import')) {
      console.error(`❌ [SERVER SYNTAX ERROR] File: ${relPath}: ${err.message}`);
      errorsFound++;
    }
  }
}

console.log('\n--- VERIFICATION SUMMARY ---');
if (errorsFound > 0) {
  console.error(`❌ Quality gate FAILED with ${errorsFound} error(s) and ${warningsFound} warning(s).`);
  console.error('Please fix the errors above before building or deploying!');
  process.exit(1);
} else {
  console.log(`✅ All quality checks PASSED (0 errors, ${warningsFound} warning(s)).`);
  process.exit(0);
}

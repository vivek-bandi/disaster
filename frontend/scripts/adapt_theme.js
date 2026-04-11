const fs = require('fs');
const path = require('path');

const DIRECTORIES = [
  path.join(__dirname, '../src/pages'),
  path.join(__dirname, '../src/components')
];

// Avoid breaking already mapped things
const REPLACEMENTS = [
  // Text White
  { regex: /(?<!dark:)text-white/g, replace: 'text-surface-900 dark:text-white' },
  // Grays to Surface-X
  { regex: /(?<!dark:)text-gray-200/g, replace: 'text-surface-800 dark:text-gray-200' },
  { regex: /(?<!dark:)text-gray-300/g, replace: 'text-surface-600 dark:text-gray-300' },
  { regex: /(?<!dark:)text-gray-400/g, replace: 'text-surface-500 dark:text-gray-400' },
  { regex: /(?<!dark:)text-gray-500/g, replace: 'text-surface-500 dark:text-gray-500' },
  // Backgrounds
  { regex: /(?<!dark:)bg-surface-800(\/\d+)?/g, replace: 'bg-white dark:bg-surface-800$1' },
  { regex: /(?<!dark:)bg-surface-700/g, replace: 'bg-surface-50 dark:bg-surface-700' },
  { regex: /(?<!dark:)bg-\[\#0B1220\]/g, replace: 'bg-surface-50 dark:bg-[#0B1220]' },
  // Borders
  { regex: /(?<!dark:)border-surface-600/g, replace: 'border-surface-200 dark:border-surface-600' },
  { regex: /(?<!dark:)border-surface-700/g, replace: 'border-surface-200 dark:border-surface-700' },
  { regex: /(?<!dark:)border-gray-800/g, replace: 'border-surface-200 dark:border-gray-800' },
  // Grid upgrades (enforce md: for existing grid-cols that drop instantly on mobile)
  { regex: /grid-cols-2/g, replace: 'grid-cols-1 md:grid-cols-2' },
  { regex: /grid-cols-3/g, replace: 'grid-cols-1 md:grid-cols-3' },
  { regex: /grid-cols-4/g, replace: 'grid-cols-1 md:grid-cols-4' },
];

// Re-patch grid-cols that already had 'md:' or 'sm:' prefix so they don't break
const RESTORE_PATCHES = [
  { regex: /md:grid-cols-1 md:grid-cols-2/g, replace: 'md:grid-cols-2' },
  { regex: /sm:grid-cols-1 md:grid-cols-2/g, replace: 'sm:grid-cols-2' },
  { regex: /lg:grid-cols-1 md:grid-cols-3/g, replace: 'lg:grid-cols-3' },
  { regex: /lg:grid-cols-1 md:grid-cols-4/g, replace: 'lg:grid-cols-4' },
  { regex: /md:grid-cols-1 md:grid-cols-3/g, replace: 'md:grid-cols-3' },
  { regex: /grid-cols-1 md:grid-cols-1/g, replace: 'grid-cols-1' },
  // Also LoginPage uses 'text-white' but we don't want to break it since we explicitly mapped it already. We'll skip LoginPage completely.
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.js') && !fullPath.includes('LoginPage.js') && !fullPath.includes('Layout.js') && !fullPath.includes('SettingsPage.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      let modified = content;
      for (const { regex, replace } of REPLACEMENTS) {
        modified = modified.replace(regex, replace);
      }
      for (const { regex, replace } of RESTORE_PATCHES) {
        modified = modified.replace(regex, replace);
      }

      if (modified !== content) {
        fs.writeFileSync(fullPath, modified, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

DIRECTORIES.forEach(processDirectory);
console.log('Complete!');

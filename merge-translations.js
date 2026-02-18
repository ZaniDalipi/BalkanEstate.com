const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src/i18n/locales');
const enDir = path.join(localesDir, 'en');
const targetLangs = ['sq', 'sr', 'mk', 'bs', 'hr', 'bg', 'ro', 'el', 'me'];

// Deep merge function - adds missing keys from source to target
function deepMerge(target, source) {
  const result = { ...target };
  
  for (const key of Object.keys(source)) {
    if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      // If target doesn't have this key, add the whole object
      if (!result[key]) {
        result[key] = source[key];
      } else if (typeof result[key] === 'object' && !Array.isArray(result[key])) {
        // Both are objects, recursively merge
        result[key] = deepMerge(result[key], source[key]);
      }
      // If target already has it as a value, keep target's value
    } else if (!(key in result)) {
      // Key doesn't exist in target, add it
      result[key] = source[key];
    }
    // If key exists in target, keep target's value (it's the translation)
  }
  
  return result;
}

// Get all JSON files from English
const enFiles = fs.readdirSync(enDir).filter(f => f.endsWith('.json'));

for (const lang of targetLangs) {
  const langDir = path.join(localesDir, lang);
  console.log(`\nProcessing ${lang}...`);
  
  for (const file of enFiles) {
    const enPath = path.join(enDir, file);
    const langPath = path.join(langDir, file);
    
    const enContent = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    
    let langContent = {};
    if (fs.existsSync(langPath)) {
      langContent = JSON.parse(fs.readFileSync(langPath, 'utf8'));
    }
    
    // Merge - keep existing translations, add new keys from English
    const merged = deepMerge(langContent, enContent);
    
    // Write back
    fs.writeFileSync(langPath, JSON.stringify(merged, null, 2) + '\n');
    console.log(`  Updated ${file}`);
  }
}

console.log('\nDone! New keys added with English values.');

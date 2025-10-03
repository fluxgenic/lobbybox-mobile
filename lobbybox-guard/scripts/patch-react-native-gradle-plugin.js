const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '..',
  'node_modules',
  '@react-native',
  'gradle-plugin',
  'build.gradle.kts'
);

if (!fs.existsSync(targetFile)) {
  console.warn('[patch-react-native-gradle-plugin] File not found, skipping:', targetFile);
  process.exit(0);
}

const marker = 'private inline fun <reified T : Any> Project.serviceOf(): T';
const importNeedle = 'import org.gradle.configurationcache.extensions.serviceOf';
const raw = fs.readFileSync(targetFile, 'utf8');

if (raw.includes(importNeedle)) {
  console.log(
    '[patch-react-native-gradle-plugin] build.gradle.kts uses configurationcache serviceOf. Skipping patch.'
  );
  process.exit(0);
}

if (raw.includes(marker)) {
  console.log('[patch-react-native-gradle-plugin] build.gradle.kts already patched.');
  process.exit(0);
}

let updated = raw;
if (updated.includes(importNeedle)) {
  updated = updated.replace(
    importNeedle,
    'import org.gradle.api.Project\nimport org.gradle.api.internal.HasServices'
  );
} else if (!updated.includes('import org.gradle.api.internal.HasServices')) {
  updated = updated.replace(
    'import org.jetbrains.kotlin.gradle.tasks.KotlinCompile',
    "import org.jetbrains.kotlin.gradle.tasks.KotlinCompile\nimport org.gradle.api.Project\nimport org.gradle.api.internal.HasServices"
  );
}

const serviceCallNeedle = 'serviceOf<ModuleRegistry>()';
if (updated.includes(serviceCallNeedle)) {
  updated = updated.replace(serviceCallNeedle, 'project.serviceOf<ModuleRegistry>()');
}

if (!updated.includes(marker)) {
  updated = `${updated}\nprivate fun <T : Any> Project.serviceOf(type: Class<T>): T =\n    (this as HasServices).services.get(type)\n\nprivate inline fun <reified T : Any> Project.serviceOf(): T = serviceOf(T::class.java)\n`;
}

fs.writeFileSync(targetFile, updated, 'utf8');
console.log('[patch-react-native-gradle-plugin] Patched build.gradle.kts to avoid serviceOf import.');

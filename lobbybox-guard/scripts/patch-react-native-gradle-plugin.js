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
const newImplementationNeedle = '(this as ProjectInternal).services.get(type)';
const raw = fs.readFileSync(targetFile, 'utf8');

if (raw.includes(marker) && raw.includes(newImplementationNeedle)) {
  console.log('[patch-react-native-gradle-plugin] build.gradle.kts already patched.');
  process.exit(0);
}

let updated = raw;

const oldImplementationRegex = /private fun <T : Any> Project\.serviceOf\(type: Class<T>\): T =\n    \(this as HasServices\)\.services.get\(type\)\n\nprivate inline fun <reified T : Any> Project\.serviceOf\(\): T = serviceOf\(T::class\.java\)\n?/;
updated = updated.replace(oldImplementationRegex, '');

updated = updated.replace('import org.gradle.api.internal.HasServices\n', '');

const configurationCacheImport = 'import org.gradle.configurationcache.extensions.serviceOf';
if (updated.includes(configurationCacheImport)) {
  updated = updated.replace(configurationCacheImport, 'import org.gradle.api.Project\nimport org.gradle.api.internal.project.ProjectInternal');
} else {
  if (!updated.includes('import org.gradle.api.Project')) {
    updated = updated.replace(
      'import org.jetbrains.kotlin.gradle.tasks.KotlinCompile',
      "import org.jetbrains.kotlin.gradle.tasks.KotlinCompile\nimport org.gradle.api.Project"
    );
  }
  if (!updated.includes('import org.gradle.api.internal.project.ProjectInternal')) {
    updated = updated.replace(
      'import org.gradle.api.Project',
      "import org.gradle.api.Project\nimport org.gradle.api.internal.project.ProjectInternal"
    );
  }
}

const serviceCallRegex = /(\W)serviceOf<ModuleRegistry>\(\)/g;
updated = updated.replace(serviceCallRegex, (_, prefix) => `${prefix}project.serviceOf<ModuleRegistry>()`);

if (!updated.includes(marker) || !updated.includes(newImplementationNeedle)) {
  updated = `${updated}\nprivate fun <T : Any> Project.serviceOf(type: Class<T>): T =\n    (this as ProjectInternal).services.get(type)\n\nprivate inline fun <reified T : Any> Project.serviceOf(): T = serviceOf(T::class.java)\n`;
}

fs.writeFileSync(targetFile, updated, 'utf8');
console.log('[patch-react-native-gradle-plugin] Patched build.gradle.kts to avoid serviceOf import.');

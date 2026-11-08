import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Version the copied worker from final deployment bytes, without git metadata
 * or writes to public/. Identical output produces an identical worker.
 * @returns {import('vite').Plugin}
 */
export function serviceWorkerVersioning() {
  return {
    name: 'levelup-service-worker-versioning',
    apply: 'build',
    writeBundle: {
      order: 'post',
      sequential: true,
      async handler(options) {
        if (!options.dir) {
          throw new Error('Service worker versioning requires a build output directory');
        }

        const outputDirectory = path.resolve(options.dir);
        const files = (await readdir(outputDirectory, { recursive: true, withFileTypes: true }))
          .filter(entry => entry.isFile())
          .map(entry =>
            path
              .relative(outputDirectory, path.join(entry.parentPath, entry.name))
              .split(path.sep)
              .join('/')
          )
          .sort();
        const workerPath = path.join(outputDirectory, 'sw.js');
        const template = await readFile(workerPath, 'utf8');
        const releaseMarker = "const RELEASE_ID = 'development'; // __RELEASE_ID__";
        const assetsMarker = 'const BUILD_ASSETS = []; // __BUILD_ASSETS__';
        if (!template.includes(releaseMarker) || !template.includes(assetsMarker)) {
          throw new Error('Service worker versioning template markers are missing');
        }

        const hash = createHash('sha256').update(template);
        for (const file of files.filter(file => file !== 'sw.js')) {
          hash.update(JSON.stringify(file)).update('\0');
          hash.update(await readFile(path.join(outputDirectory, file))).update('\0');
        }
        const releaseId = hash.digest('hex');
        const assets = files
          .filter(file => /\.(?:js|css)$/.test(file) && file !== 'sw.js')
          .map(file => `/${file.split('/').map(encodeURIComponent).join('/')}`);
        const worker = template
          .replace(releaseMarker, `const RELEASE_ID = '${releaseId}';`)
          .replace(assetsMarker, `const BUILD_ASSETS = ${JSON.stringify(assets)};`);
        if (/__[A-Z_]+__/.test(worker)) {
          throw new Error('Service worker build output contains unresolved placeholders');
        }
        await writeFile(workerPath, worker);
      },
    },
  };
}

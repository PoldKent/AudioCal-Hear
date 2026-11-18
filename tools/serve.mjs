import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const hostname = '127.0.0.1';
const port = Number(process.env.PORT || 4177);
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.json','application/json; charset=utf-8'],['.css','text/css; charset=utf-8']]);
// Explicit allowlist mirrors the public deployment: Hear 3 beta is the root,
// and Hear 2 remains a standalone legacy fallback at /hear2/.
const allowedFiles = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/hear2/', 'hear2/index.html'],
  ['/hear2/index.html', 'hear2/index.html'],
  ['/hear3-preview/', 'hear3-preview/index.html'],
  ['/hear3-preview/index.html', 'hear3-preview/index.html'],
  ['/hear3-exam/', 'hear3-exam/index.html'],
  ['/hear3-exam/index.html', 'hear3-exam/index.html'],
  ['/hear3-library/', 'hear3-library/index.html'],
  ['/hear3-library/index.html', 'hear3-library/index.html'],
  ['/hear3-eq-editor/', 'hear3-eq-editor/index.html'],
  ['/hear3-eq-editor/index.html', 'hear3-eq-editor/index.html'],
  ['/src/hear3/provisional-eq-editor.mjs', 'src/hear3/provisional-eq-editor.mjs'],
  ['/src/hear3/app-shell.css', 'src/hear3/app-shell.css'],
  ['/src/hear3/app-theme.mjs', 'src/hear3/app-theme.mjs'],
  ['/src/hear3/app-i18n.mjs', 'src/hear3/app-i18n.mjs'],
  ['/src/hear3/immediate-eq-result.mjs', 'src/hear3/immediate-eq-result.mjs'],
  ['/src/hear3/eq-edit-history.mjs', 'src/hear3/eq-edit-history.mjs'],
  ['/src/hear3/manual-eq-application-guide.mjs', 'src/hear3/manual-eq-application-guide.mjs'],
  ['/src/hear3/photo-band-assistant.mjs', 'src/hear3/photo-band-assistant.mjs'],
  ['/src/hear3/guided-journey.mjs', 'src/hear3/guided-journey.mjs'],
  ['/src/hear3/primary-listening-console.mjs', 'src/hear3/primary-listening-console.mjs'],
  ['/src/hear3/digital-tone-visualizer.mjs', 'src/hear3/digital-tone-visualizer.mjs'],
  ['/hear3-dual-restore/', 'hear3-dual-restore/index.html'],
  ['/hear3-dual-restore/index.html', 'hear3-dual-restore/index.html'],
  ['/src/hear3/guarded-dual-archive-restore.mjs', 'src/hear3/guarded-dual-archive-restore.mjs'],
  ['/hear3-offline-manifest.json', 'hear3-offline-manifest.json'],
  ['/hear3-offline-sw.js', 'hear3-offline-sw.js'],
  ['/src/hear3/offline-optin.mjs', 'src/hear3/offline-optin.mjs'],
  ['/src/hear3/audio-capability-preflight.mjs', 'src/hear3/audio-capability-preflight.mjs'],
  ['/src/hear3/read-throttle.mjs', 'src/hear3/read-throttle.mjs'],
  ['/src/hear3/bounded-eq-engine.mjs', 'src/hear3/bounded-eq-engine.mjs'],
  ['/src/hear3/eq-digital-transfer-model.mjs', 'src/hear3/eq-digital-transfer-model.mjs'],
  ['/src/hear3/eq-control-quantization.mjs', 'src/hear3/eq-control-quantization.mjs'],
  ['/src/hear3/eq-band-layouts.mjs', 'src/hear3/eq-band-layouts.mjs'],
  ['/src/hear3/coordinated-catalog-writer.mjs', 'src/hear3/coordinated-catalog-writer.mjs'],
  ['/hear3-privacy/', 'hear3-privacy/index.html'],
  ['/hear3-privacy/index.html', 'hear3-privacy/index.html'],
  ['/hear3-diagnostics/', 'hear3-diagnostics/index.html'],
  ['/hear3-diagnostics/index.html', 'hear3-diagnostics/index.html'],
  ['/hear3-photo-privacy/', 'hear3-photo-privacy/index.html'],
  ['/hear3-photo-privacy/index.html', 'hear3-photo-privacy/index.html'],
  ['/src/hear3/private-photo-sanitizer.mjs', 'src/hear3/private-photo-sanitizer.mjs'],
  ['/src/hear3/local-diagnostics.mjs', 'src/hear3/local-diagnostics.mjs'],
  ['/src/hear3/scoped-storage-cleanup.mjs', 'src/hear3/scoped-storage-cleanup.mjs'],
  ['/tests/fixtures/hear3-audio-pilot.html', 'tests/fixtures/hear3-audio-pilot.html'],
  ['/tests/fixtures/hear3-catalog-pilot.html', 'tests/fixtures/hear3-catalog-pilot.html'],
  ['/tests/fixtures/hear3-legacy-v2-pilot.html', 'tests/fixtures/hear3-legacy-v2-pilot.html'],
  ['/tests/fixtures/hear3-sweep-pilot.html', 'tests/fixtures/hear3-sweep-pilot.html'],
  ['/tests/fixtures/hear3-channel-check-pilot.html', 'tests/fixtures/hear3-channel-check-pilot.html'],
  ['/tests/fixtures/hear3-integrated-exam-pilot.html', 'tests/fixtures/hear3-integrated-exam-pilot.html'],
  ['/src/hear3/session-contract.mjs', 'src/hear3/session-contract.mjs'],
  ['/src/hear3/audio-session-controller.mjs', 'src/hear3/audio-session-controller.mjs'],
  ['/src/hear3/checkpointed-audio-session.mjs', 'src/hear3/checkpointed-audio-session.mjs'],
  ['/src/hear3/local-checkpoint-store.mjs', 'src/hear3/local-checkpoint-store.mjs'],
  ['/src/hear3/checkpoint-backup-transfer.mjs', 'src/hear3/checkpoint-backup-transfer.mjs'],
  ['/src/hear3/device-profile-contract.mjs', 'src/hear3/device-profile-contract.mjs'],
  ['/src/hear3/catalog-contract.mjs', 'src/hear3/catalog-contract.mjs'],
  ['/src/hear3/catalog-backup-store.mjs', 'src/hear3/catalog-backup-store.mjs'],
  ['/src/hear3/catalog-history-reader.mjs', 'src/hear3/catalog-history-reader.mjs'],
  ['/src/hear3/catalog-selective-deletion.mjs', 'src/hear3/catalog-selective-deletion.mjs'],
  ['/src/hear3/legacy-v2-migration.mjs', 'src/hear3/legacy-v2-migration.mjs'],
  ['/src/hear3/legacy-v2-migration-audit.mjs', 'src/hear3/legacy-v2-migration-audit.mjs'],
  ['/src/hear3/legacy-v2-history-view.mjs', 'src/hear3/legacy-v2-history-view.mjs'],
  ['/src/hear3/legacy-v2-history-vault.mjs', 'src/hear3/legacy-v2-history-vault.mjs'],
  ['/src/hear3/web-audio-adapter.mjs', 'src/hear3/web-audio-adapter.mjs'],
  ['/src/hear3/manual-channel-verification.mjs', 'src/hear3/manual-channel-verification.mjs'],
  ['/src/hear3/sweep-planner.mjs', 'src/hear3/sweep-planner.mjs'],
  ['/src/hear3/adaptive-discrete-exam.mjs', 'src/hear3/adaptive-discrete-exam.mjs'],
  ['/src/hear3/contextual-error-guide.mjs', 'src/hear3/contextual-error-guide.mjs'],
  ['/src/hear3/contextual-tone-comparison.mjs', 'src/hear3/contextual-tone-comparison.mjs'],
  ['/src/hear3/adaptive-progress-store.mjs', 'src/hear3/adaptive-progress-store.mjs'],
  ['/src/hear3/resumable-adaptive-exam.mjs', 'src/hear3/resumable-adaptive-exam.mjs'],
  ['/src/hear3/adaptive-catalog-archive.mjs', 'src/hear3/adaptive-catalog-archive.mjs'],
  ['/src/hear3/sweep-audio-runner.mjs', 'src/hear3/sweep-audio-runner.mjs'],
]);
const server = http.createServer((req, res) => {
  let requested;
  try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  const allowed = allowedFiles.get(requested);
  if (!allowed) {
    res.writeHead(404, {'content-type':'text/plain'}).end('Not found'); return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, {'allow':'GET, HEAD'}).end(); return;
  }
  fs.readFile(path.join(ROOT, allowed),(err,content)=>{
    if (err) { res.writeHead(500).end('Not available'); return; }
    res.writeHead(200,{
      'content-type': mime.get(path.extname(allowed)) || 'application/octet-stream',
      'cache-control':'no-store',
      'x-content-type-options':'nosniff',
    });
    res.end(req.method === 'HEAD' ? undefined : content);
  });
});
server.listen(port,hostname,()=>console.log('AudioCal test server http://'+hostname+':'+port));

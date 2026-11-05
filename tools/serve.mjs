import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const hostname = '127.0.0.1';
const port = Number(process.env.PORT || 4177);
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.mjs','text/javascript; charset=utf-8'],['.json','application/json; charset=utf-8'],['.css','text/css; charset=utf-8']]);
// Only this local development server serves the isolated Hear 3.0 pilot.
// The public GitHub Pages site still serves index.html and does not link it.
const allowedFiles = new Map([
  ['/', 'index.html'],
  ['/index.html', 'index.html'],
  ['/hear3-preview/', 'hear3-preview/index.html'],
  ['/hear3-preview/index.html', 'hear3-preview/index.html'],
  ['/hear3-offline-manifest.json', 'hear3-offline-manifest.json'],
  ['/hear3-offline-sw.js', 'hear3-offline-sw.js'],
  ['/src/hear3/offline-optin.mjs', 'src/hear3/offline-optin.mjs'],
  ['/src/hear3/audio-capability-preflight.mjs', 'src/hear3/audio-capability-preflight.mjs'],
  ['/src/hear3/read-throttle.mjs', 'src/hear3/read-throttle.mjs'],
  ['/src/hear3/bounded-eq-engine.mjs', 'src/hear3/bounded-eq-engine.mjs'],
  ['/src/hear3/eq-digital-transfer-model.mjs', 'src/hear3/eq-digital-transfer-model.mjs'],
  ['/hear3-privacy/', 'hear3-privacy/index.html'],
  ['/hear3-privacy/index.html', 'hear3-privacy/index.html'],
  ['/hear3-diagnostics/', 'hear3-diagnostics/index.html'],
  ['/hear3-diagnostics/index.html', 'hear3-diagnostics/index.html'],
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
  ['/src/hear3/web-audio-adapter.mjs', 'src/hear3/web-audio-adapter.mjs'],
  ['/src/hear3/manual-channel-verification.mjs', 'src/hear3/manual-channel-verification.mjs'],
  ['/src/hear3/sweep-planner.mjs', 'src/hear3/sweep-planner.mjs'],
  ['/src/hear3/adaptive-discrete-exam.mjs', 'src/hear3/adaptive-discrete-exam.mjs'],
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

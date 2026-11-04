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
  ['/tests/fixtures/hear3-audio-pilot.html', 'tests/fixtures/hear3-audio-pilot.html'],
  ['/src/hear3/session-contract.mjs', 'src/hear3/session-contract.mjs'],
  ['/src/hear3/audio-session-controller.mjs', 'src/hear3/audio-session-controller.mjs'],
  ['/src/hear3/web-audio-adapter.mjs', 'src/hear3/web-audio-adapter.mjs'],
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

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const hostname = '127.0.0.1';
const port = Number(process.env.PORT || 4177);
const mime = new Map([['.html','text/html; charset=utf-8'],['.js','text/javascript; charset=utf-8'],['.json','application/json; charset=utf-8'],['.css','text/css; charset=utf-8']]);
const server = http.createServer((req, res) => {
  let requested;
  try { requested = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (requested !== '/' && requested !== '/index.html') {
    res.writeHead(404, {'content-type':'text/plain'}).end('Not found'); return;
  }
  fs.readFile(path.join(ROOT,'index.html'),(err,content)=>{
    if (err) { res.writeHead(500).end('Not available'); return; }
    res.writeHead(200,{'content-type':mime.get('.html'),'cache-control':'no-store','x-content-type-options':'nosniff'});
    res.end(content);
  });
});
server.listen(port,hostname,()=>console.log('AudioCal test server http://'+hostname+':'+port));

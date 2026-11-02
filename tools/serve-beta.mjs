// AudioCal Hear beta preview: local-only server, no dependencies and no network APIs.
// Usage: node tools/serve-beta.mjs (repo) or node serve-beta.mjs (beta bundle)
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const port=Number(process.env.HEAR_BETA_PORT||8765);
if(!Number.isInteger(port)||port<1024||port>65535){
 console.error('HEAR_BETA_PORT debe ser un puerto entre 1024 y 65535.');
 process.exit(1);
}
let html;
try{
 html=await readFile(resolve(process.cwd(),'index.html'));
 if(!html.subarray(0,80).toString('utf8').toLowerCase().includes('<!doctype html>'))throw Error('Archivo HTML inesperado');
}catch(err){
 console.error('No se pudo abrir index.html en la carpeta actual:',err.message);
 process.exit(1);
}
const address='http://127.0.0.1:'+port+'/';
const server=createServer((req,res)=>{
 const pathname=new URL(req.url||'/',address).pathname;
 const common={
  'Cache-Control':'no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
  'Cross-Origin-Resource-Policy':'same-origin',
  'X-Frame-Options':'DENY'
 };
 if((req.method==='GET'||req.method==='HEAD')&&(pathname==='/'||pathname==='/index.html')){
  res.writeHead(200,{...common,'Content-Type':'text/html; charset=utf-8','Content-Length':html.length});
  res.end(req.method==='HEAD'?undefined:html);
  return;
 }
 if((req.method==='GET'||req.method==='HEAD')&&pathname==='/favicon.ico'){
  res.writeHead(204,common);res.end();return;
 }
 res.writeHead(404,{...common,'Content-Type':'text/plain; charset=utf-8'});
 res.end('Esta beta solo publica index.html localmente.');
});
server.on('error',error=>{console.error('No se pudo iniciar la beta:',error.message);process.exitCode=1});
server.listen(port,'127.0.0.1',()=>{
 console.log('AudioCal Hear 2.0 BETA — servidor local');
 console.log('Abre '+address+' en el navegador de esta computadora.');
 console.log('No hay acceso desde otros equipos. Pulsa Ctrl+C para detener la beta.');
});

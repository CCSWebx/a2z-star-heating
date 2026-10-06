'use strict';
// Minimal static file server for local preview. Usage: node scripts/serve.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const types = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp'
};

function createServer() {
  return http.createServer((req, res) => {
    let pathname = decodeURIComponent(req.url.split('?')[0]);
    if (pathname.endsWith('/')) pathname += 'index.html';
    const file = path.join(root, pathname);
    const inRoot = file.startsWith(root + path.sep);
    const allowed = inRoot && !/(^|[\\/])(node_modules|scripts|tests|\.git)([\\/]|$)/.test(path.relative(root, file));
    if (!allowed || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
}

module.exports = { createServer };

if (require.main === module) {
  const port = Number(process.argv[2]) || 8080;
  createServer().listen(port, () => console.log(`http://localhost:${port}`));
}

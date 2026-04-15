const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  const filePath = path.join(process.cwd(), 'timesheet-processor-web', 'public', req.url === '/' ? 'index.html' : req.url);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found: ' + filePath);
      return;
    }

    let contentType = 'text/plain';
    if (req.url.endsWith('.html') || req.url === '/') contentType = 'text/html';
    else if (req.url.endsWith('.css')) contentType = 'text/css';
    else if (req.url.endsWith('.js')) contentType = 'application/javascript';
    else if (req.url.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (req.url.endsWith('.json')) contentType = 'application/json';
    else if (req.url.endsWith('.png')) contentType = 'image/png';
    else if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (req.url.endsWith('.woff2')) contentType = 'font/woff2';
    else if (req.url.endsWith('.woff')) contentType = 'font/woff';
    else if (req.url.endsWith('.ttf')) contentType = 'font/ttf';

    res.writeHead(200, {
      'Content-Type': contentType + '; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.end(data);
  });
});

const PORT = 5184;
server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
  console.log(`📁 Arquivos servidos de: ${path.join(process.cwd(), 'timesheet-processor-web', 'public')}`);
});
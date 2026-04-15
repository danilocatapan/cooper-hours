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
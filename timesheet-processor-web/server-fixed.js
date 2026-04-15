import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 5184;
const PUBLIC_DIR = path.join(__dirname, 'public');

const server = http.createServer((req, res) => {
  let filePath = path.join(PUBLIC_DIR, req.url === '/' ? 'index.html' : req.url);

  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // If file doesn't exist, serve index.html for SPA routing
        filePath = path.join(PUBLIC_DIR, 'index.html');
        fs.stat(filePath, (err2, stats2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          serveFile(filePath, stats2, res);
        });
      } else {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fs.stat(filePath, (err2, stats2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        serveFile(filePath, stats2, res);
      });
    } else {
      serveFile(filePath, stats, res);
    }
  });
});

function serveFile(filePath, stats, res) {
  const ext = path.extname(filePath);
  const contentType = getContentType(ext);

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
}

function getContentType(ext) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
  };
  return types[ext] || 'text/plain; charset=utf-8';
}

server.listen(PORT, () => {
  console.log(`Servidor rodando em: http://localhost:${PORT}`);
});
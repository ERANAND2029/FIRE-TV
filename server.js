/**
 * Family Watch Referee - Production Web Server for Render & Cloud Deployment
 * 
 * Supports:
 *  - Native Node.js HTTP fallback + Express support
 *  - /health endpoint for Render health checks
 *  - Dynamic PORT binding (default: 10000 on Render, 3000 locally)
 *  - Fallback config.js handler
 *  - Graceful shutdown handling
 */

const path = require('path');
const fs = require('fs');
const http = require('http');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

// Web directories in priority order
const CANDIDATE_DIRS = [
  path.join(__dirname, 'public'),
  path.join(__dirname, 'app', 'src', 'main', 'assets', 'www')
];

let WEB_DIR = CANDIDATE_DIRS.find(dir => fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html')));

if (!WEB_DIR) {
  WEB_DIR = path.join(__dirname, 'app', 'src', 'main', 'assets', 'www');
}

console.log(`[Family Watch Referee] Serving static web assets from: ${WEB_DIR}`);

// Check if express is available
let useExpress = false;
try {
  require.resolve('express');
  useExpress = true;
} catch (e) {
  useExpress = false;
}

if (useExpress) {
  const express = require('express');
  const app = express();

  // Health check endpoint for Render health probes
  app.get(['/health', '/healthz'], (req, res) => {
    res.status(200).json({
      status: 'ok',
      service: 'Family Watch Referee',
      version: '1.0.0',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  });

  // Serve config.js gracefully (avoid 404 if user hasn't added custom config.js)
  app.get('/config.js', (req, res) => {
    const configPath = path.join(WEB_DIR, 'config.js');
    if (fs.existsSync(configPath)) {
      return res.sendFile(configPath);
    }
    const examplePath = path.join(WEB_DIR, 'config.example.js');
    if (fs.existsSync(examplePath)) {
      return res.sendFile(examplePath);
    }
    res.type('application/javascript').send(`
      window.APP_CONFIG = {
        useBedrock: false,
        awsRegion: "us-east-1",
        bedrockModelId: "anthropic.claude-3-haiku-20240307-v1:0"
      };
    `);
  });

  // Serve static assets with appropriate caching
  app.use(express.static(WEB_DIR, {
    index: 'index.html',
    etag: true,
    lastModified: true,
    maxAge: '1h'
  }));

  // Fallback route for SPA or direct entry
  app.get('*', (req, res) => {
    res.sendFile(path.join(WEB_DIR, 'index.html'));
  });

  const server = app.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`📺 Family Watch Referee Web Server is LIVE!`);
    console.log(`🚀 URL: http://${HOST}:${PORT}`);
    console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
    console.log(`====================================================`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Closing HTTP server...`);
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

} else {
  // Built-in HTTP server fallback (Zero npm dependencies required)
  console.log('[Family Watch Referee] Using built-in Node.js HTTP server (fallback mode)...');

  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8'
  };

  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    let pathname = decodeURIComponent(parsedUrl.pathname);

    // Health check endpoint
    if (pathname === '/health' || pathname === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        status: 'ok',
        service: 'Family Watch Referee',
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
      }));
    }

    if (pathname === '/' || pathname === '') {
      pathname = '/index.html';
    }

    let filePath = path.join(WEB_DIR, pathname);

    // Handle config.js fallback
    if (pathname === '/config.js' && !fs.existsSync(filePath)) {
      filePath = path.join(WEB_DIR, 'config.example.js');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        filePath = path.join(WEB_DIR, 'index.html');
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (readErr, data) => {
        if (readErr) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          return res.end('500 Internal Server Error');
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      });
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`====================================================`);
    console.log(`📺 Family Watch Referee HTTP Server is LIVE!`);
    console.log(`🚀 URL: http://${HOST}:${PORT}`);
    console.log(`🏥 Health check: http://${HOST}:${PORT}/health`);
    console.log(`====================================================`);
  });

  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}. Closing server...`);
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

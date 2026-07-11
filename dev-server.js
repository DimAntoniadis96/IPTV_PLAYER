/* =====================================================================
 * dev-server.js — Zero-dependency static dev server (Node built-ins only)
 * ---------------------------------------------------------------------
 * Serves the app over http with the correct MIME types (ES modules need a
 * JavaScript MIME type). Run with `npm run dev`.
 *
 *   PORT=3000 npm run dev     # override the port (default 8080)
 *
 * This file is a DEV TOOL only — it is not part of the Tizen package.
 * ===================================================================== */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;

/** Extension -> Content-Type. */
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'text/javascript; charset=utf-8',   // required for ES modules
    '.mjs':  'text/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
    '.m3u':  'application/vnd.apple.mpegurl; charset=utf-8',
    '.m3u8': 'application/vnd.apple.mpegurl; charset=utf-8',
    '.xml':  'application/xml; charset=utf-8',
    '.map':  'application/json; charset=utf-8'
};

const server = http.createServer((req, res) => {
    // Strip query string and decode.
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/') urlPath = '/index.html';

    // Resolve within ROOT and block directory traversal.
    const filePath = path.normalize(path.join(ROOT, urlPath));
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end('403 Forbidden'); return;
    }

    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found: ' + urlPath);
            log(req, 404);
            return;
        }
        const type = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
        res.writeHead(200, {
            'Content-Type': type,
            'Cache-Control': 'no-cache',              // always fresh during dev
            'Access-Control-Allow-Origin': '*'        // help when testing locally
        });
        fs.createReadStream(filePath).pipe(res);
        log(req, 200);
    });
});

function log(req, status) {
    const stamp = new Date().toISOString().slice(11, 19);
    console.log(`${stamp}  ${status}  ${req.method}  ${req.url}`);
}

// Auto-increment retry state.
let currentPort = PORT;
let attemptsLeft = 10;

// Printed only once the socket is actually bound, so the port is correct.
server.on('listening', () => {
    const port = server.address().port;
    console.log('\n  IPTV Player — dev server running');
    console.log(`  →  http://localhost:${port}\n`);
    console.log('  Open the URL in Chrome, then F12 → device toolbar → 1920×1080.');
    console.log('  Stop with Ctrl+C.\n');
});

// If the port is busy, try the next one instead of crashing.
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
        const next = currentPort + 1;
        console.log(`  Port ${currentPort} is in use — trying ${next}…`);
        currentPort = next;
        attemptsLeft -= 1;
        setTimeout(() => server.listen(next), 150);
        return;
    }
    if (err.code === 'EADDRINUSE') {
        console.error(`\n  Could not find a free port near ${PORT}.`);
        console.error('  Free it with:  lsof -ti:' + PORT + ' | xargs kill');
        console.error('  Or choose one:  PORT=3000 npm run dev\n');
        process.exit(1);
    }
    throw err;
});

server.listen(currentPort);

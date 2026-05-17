const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 2000;
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist');
const METADATA_FILE = path.join(UPLOAD_DIR, 'metadata.json');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/files', express.static(UPLOAD_DIR));
app.use(express.static(FRONTEND_DIST));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

const upload = multer({ storage });

const getFiles = () => {
  const files = fs.readdirSync(UPLOAD_DIR).filter(f => f !== path.basename(METADATA_FILE));
  let metadata = {};
  try {
    if (fs.existsSync(METADATA_FILE)) {
      metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8') || '{}');
    }
  } catch (err) {
    console.warn('Failed to read metadata.json', err);
    metadata = {};
  }
  return files
    .map((filename) => {
      const filepath = path.join(UPLOAD_DIR, filename);
      const stat = fs.statSync(filepath);
      const meta = metadata[filename] || {};
      return {
        filename,
        originalName: meta.originalName || filename.replace(/^\d+-/, ''),
        size: stat.size,
        mimeType: getMimeType(filename),
        uploadedAt: stat.mtime.getTime(),
        uploader: meta.uploader || 'Unknown',
        url: `/files/${encodeURIComponent(filename)}`
      };
    })
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
};

const saveMetadata = (meta) => {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(meta, null, 2));
  } catch (err) {
    console.warn('Failed to write metadata.json', err);
  }
};

const getMimeType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'].includes(ext)) return 'image';
  if (['.mp4', '.webm', '.mov', '.m4v', '.ogv'].includes(ext)) return 'video';
  if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) return 'audio';
  if (['.pdf'].includes(ext)) return 'pdf';
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) return 'archive';
  return 'file';
};

app.get('/api/files', (req, res) => {
  try {
    res.json(getFiles());
  } catch (error) {
    res.status(500).json({ message: 'Unable to load files' });
  }
});

app.post('/upload', upload.array('files', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded' });
  }

  const uploader = (req.body && req.body.uploader) || req.headers['x-uploader-name'] || 'Unknown';

  // load existing metadata
  let metadata = {};
  try {
    if (fs.existsSync(METADATA_FILE)) {
      metadata = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8') || '{}');
    }
  } catch (err) {
    metadata = {};
  }

  const uploaded = req.files.map((file) => {
    metadata[file.filename] = {
      uploader,
      originalName: file.originalname,
      uploadedAt: Date.now()
    };

    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: getMimeType(file.originalname),
      uploadedAt: Date.now(),
      uploader,
      url: `/files/${encodeURIComponent(file.filename)}`
    };
  });

  saveMetadata(metadata);

  io.emit('file-added', uploaded);
  return res.json({ uploaded });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

const clients = new Map();

const emitClientState = () => {
  io.emit('client-count', { count: clients.size, devices: Array.from(clients.values()).map(c => ({ id: c.id, name: c.name || 'Unknown', address: c.address, connectedAt: c.connectedAt })) });
};

io.on('connection', (socket) => {
  const client = {
    id: socket.id,
    connectedAt: Date.now(),
    address: socket.handshake.address,
    name: (socket.handshake && socket.handshake.auth && socket.handshake.auth.name) || (socket.handshake.query && socket.handshake.query.name) || 'Unknown'
  };
  clients.set(socket.id, client);
  emitClientState();

  socket.on('register', (payload) => {
    try {
      const name = (payload && payload.name) || 'Unknown';
      const existing = clients.get(socket.id) || {};
      existing.name = name;
      clients.set(socket.id, existing);
      emitClientState();
    } catch (err) {
      // ignore
    }
  });

  socket.on('disconnect', () => {
    clients.delete(socket.id);
    emitClientState();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`LAN File Share server running on http://0.0.0.0:${PORT}`);
});

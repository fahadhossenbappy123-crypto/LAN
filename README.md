# LAN File Sharing App

A modern local network file sharing dashboard built with:

- Backend: Node.js, Express, Socket.IO, Multer
- Frontend: React, Vite, TailwindCSS
- Real-time device and file updates
- Drag-and-drop upload, upload progress, preview, and download support

## Structure

- `backend/` — server code and API
- `frontend/` — React UI
- `uploads/` — stored files served from the host machine

## Setup

1. Install backend dependencies

```bash
cd backend
npm install
```

2. Install frontend dependencies

```bash
cd ../frontend
npm install
```

3. Build the frontend

```bash
npm run build
```

4. Start the server

```bash
cd ../backend
npm start
```

The server listens on `0.0.0.0:2000`, so other devices on the same LAN can connect to the host IP, for example:

```bash
http://192.168.0.100:2000
```

## Development

Run the frontend locally for dev work:

```bash
cd frontend
npm run dev -- --host
```

Run the backend independently:

```bash
cd backend
npm run dev
```

## Features

- Connected users counter with real-time updates
- Upload any file type via button or drag-and-drop
- Preview images, video, and audio files
- Download shared files from the browser
- Mobile responsive dashboard with dark mode
- QR code linking to the LAN host URL

## Notes

- Files are stored locally in the `uploads/` folder.
- The backend serves the built frontend from `frontend/dist`.

import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { FileText, Image, Video, Music, Download, Plus, Sun, Moon, Users, ArrowUpCircle, X } from 'lucide-react';
import QRCode from 'qrcode.react';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim();
  }

  const origin = window.location.origin || '';
  const isCapacitorWebView = origin.startsWith('capacitor://') || origin.startsWith('ionic://') || origin.startsWith('http://localhost') || origin.startsWith('https://localhost');
  if (isCapacitorWebView) {
    return 'http://10.0.2.2:2000';
  }

  return origin;
};

const apiBaseUrl = getApiBaseUrl();
const apiClient = axios.create({ baseURL: apiBaseUrl, timeout: 30000 });

const getIcon = (type) => {
  switch (type) {
    case 'image': return <Image className="w-6 h-6 text-cyan-500" />;
    case 'video': return <Video className="w-6 h-6 text-orange-500" />;
    case 'audio': return <Music className="w-6 h-6 text-violet-500" />;
    case 'pdf': return <FileText className="w-6 h-6 text-red-500" />;
    case 'archive': return <FileText className="w-6 h-6 text-amber-500" />;
    default: return <FileText className="w-6 h-6 text-slate-500" />;
  }
};

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};

const previewable = ['image', 'video', 'audio'];

const ensureArray = (value) => Array.isArray(value) ? value : [];

function App() {
  const [files, setFiles] = useState([]);
  const [clients, setClients] = useState({ count: 0, devices: [] });
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('Ready to share files across your local network.');
  const [darkMode, setDarkMode] = useState(true);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [deviceName, setDeviceName] = useState(localStorage.getItem('deviceName') || '');
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await apiClient.get('/api/files');
        setFiles(ensureArray(response.data));
      } catch (err) {
        setError('Unable to load files.');
      }
    };

    // determine device name and persist
    let name = localStorage.getItem('deviceName') || '';
    if (!name) {
      try {
        name = window.prompt('Enter a device name (e.g. Phone, Laptop, Office-PC)') || `${navigator.platform || 'Device'}`;
      } catch (err) {
        name = `${navigator.platform || 'Device'}`;
      }
      localStorage.setItem('deviceName', name);
      setDeviceName(name);
    } else {
      setDeviceName(name);
    }

    const socket = io(apiBaseUrl, { transports: ['websocket', 'polling'], auth: { name } });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('Connected to server. Waiting for uploads...');
      try { socket.emit('register', { name }); } catch (err) {}
    });

    socket.on('client-count', (payload) => {
      setClients(payload);
    });

    socket.on('file-added', (newFiles) => {
      const safeNewFiles = ensureArray(newFiles);
      setFiles((prev) => {
        const safePrev = ensureArray(prev);
        return [...safeNewFiles, ...safePrev].sort((a, b) => b.uploadedAt - a.uploadedAt);
      });
      setStatus(`${safeNewFiles.length} new file${safeNewFiles.length > 1 ? 's' : ''} shared.`);
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected from network. Reconnect to continue sharing.');
    });

    fetchFiles();

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const localUrl = useMemo(() => window.location.origin, []);
  const safeFiles = ensureArray(files);

  const uploadFiles = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    const formData = new FormData();
    Array.from(selectedFiles).forEach((file) => formData.append('files', file));
    const uploaderName = deviceName || localStorage.getItem('deviceName') || 'Unknown';
    formData.append('uploader', uploaderName);

    try {
      setError('');
      setUploadProgress(0);
      setStatus('Uploading files...');
      const response = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      setUploadProgress(0);
      if (response.data?.uploaded?.length) {
        setStatus('Upload finished successfully.');
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
      setStatus('Ready to share files across your local network.');
      setUploadProgress(0);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    uploadFiles(event.dataTransfer.files);
  };

  const handleSelectFiles = () => fileInputRef.current?.click();

  const handleFileChange = (event) => {
    uploadFiles(event.target.files);
    event.target.value = null;
  };

  const previewFile = (file) => {
    if (!previewable.includes(file.mimeType)) return;
    setPreview(file);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="fixed top-4 right-4 z-50">
        <h1 className="dev-badge glow-anim text-xl" aria-label="Developed by Fahad Hossen Bappy">
          <span className="sr-only">Developed by Fahad Hossen Bappy</span>
        </h1>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-400">LAN Share</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">Developed by: Fahad Hossen Bappy</h1>
              <p className="mt-4 max-w-2xl text-slate-600 dark:text-slate-400">Share files across devices on the same WiFi or router network instantly. Upload, preview, and download from any browser.</p>
            </div>

          {/* developer badge moved to fixed top-right */}

            <div className="grid gap-4 sm:grid-cols-2 lg:w-[360px]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-400">Connected devices</p>
                <div className="mt-3 flex items-center gap-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  <Users className="h-8 w-8 text-cyan-500" />
                  {clients.count}
                </div>
              </div>
              <button
                onClick={() => setDarkMode((prev) => !prev)}
                className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
              >
                {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                {darkMode ? 'Dark mode' : 'Light mode'}
              </button>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.5fr,1fr]">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Upload center</p>
                  <p className="mt-1 text-lg font-semibold">Drag, drop, or browse files</p>
                </div>
                <button
                  onClick={handleSelectFiles}
                  className="inline-flex items-center gap-2 rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500"
                >
                  <Plus className="h-4 w-4" /> Upload Files
                </button>
              </div>

              <div
                onDrop={handleDrop}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                className={`mt-6 rounded-3xl border-2 border-dashed ${dragActive ? 'border-cyan-500 bg-cyan-50/70 dark:border-cyan-400 dark:bg-cyan-500/10' : 'border-slate-300 bg-transparent dark:border-slate-700'} p-10 text-center transition`}
              >
                <ArrowUpCircle className="mx-auto h-12 w-12 text-cyan-500" />
                <p className="mt-4 text-lg font-semibold">Drop files anywhere to upload</p>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Supports images, video, audio, documents, archives, and more.</p>
              </div>

              <input ref={fileInputRef} type="file" multiple onChange={handleFileChange} className="hidden" />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-slate-100 p-4 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Current host URL</p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900 dark:text-slate-100">{localUrl}</p>
                </div>
                <div className="rounded-3xl bg-slate-100 p-4 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Quick join QR</p>
                  <div className="mt-3 flex items-center justify-center rounded-2xl bg-white p-3 shadow-sm dark:bg-slate-950">
                    <QRCode value={localUrl} size={96} fgColor={darkMode ? '#c8f0ff' : '#0f172a'} bgColor={darkMode ? '#0f172a' : '#ffffff'} />
                  </div>
                </div>
              </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className="text-sm font-semibold">Status</p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{status}</p>
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                {uploadProgress > 0 && (
                  <div className="mt-4 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className="rounded-full bg-cyan-500 py-1 text-center text-xs text-white" style={{ width: `${uploadProgress}%` }}>
                      {uploadProgress}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Live activity</p>
              <div className="mt-5 space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Connected devices</p>
                  <p className="mt-2 text-3xl font-semibold">{clients.count}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Shared files</p>
                  <p className="mt-2 text-3xl font-semibold">{safeFiles.length}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Devices</p>
                  <ul className="mt-3 max-h-40 overflow-auto text-sm">
                    {(clients.devices || []).map((d) => (
                      <li key={d.id} className="flex items-center justify-between py-1">
                        <span className="truncate">{d.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{d.address}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Shared gallery</p>
              <h2 className="mt-2 text-2xl font-semibold">Uploaded files</h2>
            </div>
            <div className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-100">
              {safeFiles.length} files available
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {safeFiles.map((file) => (
              <div key={file.filename} className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                  <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-950">{getIcon(file.mimeType)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-slate-900 dark:text-slate-100">{file.originalName}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{formatSize(file.size)}</p>
                    <p className="mt-1 text-xs text-slate-400">Uploaded by: {file.uploader || 'Unknown'}</p>
                  </div>
                </div>
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                    <span>{new Date(file.uploadedAt).toLocaleString()}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">{file.mimeType}</span>
                  </div>

                  <div className="space-x-3">
                    {previewable.includes(file.mimeType) && (
                      <button
                        onClick={() => previewFile(file)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
                      >Preview</button>
                    )}
                    <a
                      href={file.url}
                      download={file.originalName}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:text-cyan-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-300"
                    >
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {safeFiles.length === 0 && (
            <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
              No files shared yet — drop a file above to start sharing instantly.
            </div>
          )}
        </section>
      </div>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-3xl bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setPreview(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 text-slate-200 transition hover:bg-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-xl font-semibold text-white">Preview: {preview.originalName}</h3>
            <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-950 p-4">
              {preview.mimeType === 'image' && (
                <img src={preview.url} alt={preview.originalName} className="max-h-[70vh] w-full rounded-3xl object-contain" />
              )}
              {preview.mimeType === 'video' && (
                <video controls src={preview.url} className="h-[70vh] w-full rounded-3xl bg-black object-contain" />
              )}
              {preview.mimeType === 'audio' && (
                <audio controls src={preview.url} className="w-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

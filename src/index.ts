import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { renderQueue, queueEvents } from './queue';
import './worker';
import db, { initDb } from './db';
import { authenticateToken, generateToken, AuthRequest } from './auth';
import settingsRouter from './routes/settings';

// Init DB
initDb();

const app = express();
app.use(cors());
app.use(express.json());

// Configure Multer
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.resolve(process.cwd(), 'public/renders'));
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `upload-${uuidv4()}${ext}`);
    }
});
const upload = multer({ storage });

app.use('/api', settingsRouter);

// Serve Static Renders
const RENDER_DIR = path.resolve(process.cwd(), 'public/renders');
app.use('/renders', express.static(RENDER_DIR));

const convert3MFToGLB = (inputFilename: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const inputPath = path.join(RENDER_DIR, inputFilename);
        const outputFilename = inputFilename.replace(/\.3mf$/i, '.glb');
        const outputPath = path.join(RENDER_DIR, outputFilename);
        const scriptPath = path.resolve(process.cwd(), 'scripts/convert_3mf.py');

        console.log(`Converting 3MF to GLB: ${inputFilename} -> ${outputFilename}`);
        const child = spawn('python3', [scriptPath, inputPath, outputPath]);

        child.on('close', (code) => {
            if (code === 0) {
                resolve(outputFilename);
            } else {
                reject(new Error(`Conversion failed with code ${code}`));
            }
        });

        child.on('error', (err) => reject(err));
    });
};

// Serve Frontend
const CLIENT_BUILD = path.resolve(process.cwd(), 'client/dist');
app.use(express.static(CLIENT_BUILD));

// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
    if (process.env.DISABLE_REGISTRATION === 'true') {
        return res.status(403).json({ error: 'Registration is disabled by administrator.' });
    }
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({error: 'Username and password required'});
    
    try {
        const hash = await bcrypt.hash(password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const info = stmt.run(username, hash);
        const token = generateToken({ id: info.lastInsertRowid as number, username });
        res.json({ token, user: { id: info.lastInsertRowid, username } });
    } catch (e: any) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            res.status(409).json({ error: 'Username already exists' });
        } else {
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        const user: any = stmt.get(username);
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = generateToken({ id: user.id, username: user.username });
        res.json({ token, user: { id: user.id, username: user.username } });
    } catch (e) {
        res.status(500).json({ error: 'Login failed' });
    }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: (req as AuthRequest).user });
});

// --- File Routes ---
app.get('/api/files', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const stmt = db.prepare('SELECT id, name, type, updated_at FROM files WHERE user_id = ? ORDER BY updated_at DESC');
    const files = stmt.all(user.id);
    res.json(files);
});

app.get('/api/files/:id', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const stmt = db.prepare('SELECT * FROM files WHERE id = ? AND user_id = ?');
    const file = stmt.get(req.params.id, user.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
});

app.post('/api/files', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const { name, content, id, type = 'scad' } = req.body;
    
    if (id) {
        // Update
        const stmt = db.prepare('UPDATE files SET name = ?, content = ?, type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?');
        const info = stmt.run(name, content, type, id, user.id);
        if (info.changes === 0) return res.status(404).json({ error: 'File not found or permission denied' });
        res.json({ id, name, content, type });
    } else {
        // Create
        const stmt = db.prepare('INSERT INTO files (user_id, name, content, type) VALUES (?, ?, ?, ?)');
        const info = stmt.run(user.id, name, content, type);
        res.json({ id: info.lastInsertRowid, name, content, type });
    }
});

app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
    const user = (req as AuthRequest).user!;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const type = ext === '.stl' ? 'stl' : (ext === '.obj' ? 'obj' : '3mf');
    const name = req.file.originalname;
    const content = req.file.filename; // Store the disk filename as content for uploads

    // If 3MF, attempt conversion to GLB for better viewer support
    if (type === '3mf') {
        convert3MFToGLB(content).catch(err => console.error("Auto-conversion failed:", err));
    }

    const stmt = db.prepare('INSERT INTO files (user_id, name, content, type) VALUES (?, ?, ?, ?)');
    const info = stmt.run(user.id, name, content, type);

    res.json({ 
        id: info.lastInsertRowid, 
        name, 
        content, 
        type,
        url: `/renders/${content}`
    });
});

app.delete('/api/files/:id', authenticateToken, async (req, res) => {
    const user = (req as AuthRequest).user!;
    const { id } = req.params;

    try {
        // Get file info first to handle filesystem cleanup
        const stmt = db.prepare('SELECT content, type FROM files WHERE id = ? AND user_id = ?');
        const file: any = stmt.get(id, user.id);
        
        if (!file) return res.status(404).json({ error: 'File not found' });

        // If it's an uploaded mesh, delete the actual file
        if (file.type !== 'scad' && file.content) {
            const filePath = path.join(RENDER_DIR, file.content);
            await fs.unlink(filePath).catch(() => {}); // Ignore if already gone
            
            // Also cleanup potential GLB conversion
            if (file.type === '3mf') {
                const glbPath = filePath.replace(/\.3mf$/i, '.glb');
                await fs.unlink(glbPath).catch(() => {});
            }
        }

        // Delete from DB
        const deleteStmt = db.prepare('DELETE FROM files WHERE id = ? AND user_id = ?');
        deleteStmt.run(id, user.id);

        res.sendStatus(200);
    } catch (e) {
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

// --- Render Route ---
app.post('/api/render', authenticateToken, async (req, res) => {
    const user = (req as AuthRequest).user!;
    const { fileId, scadContent, params = {}, options = {}, isPreview, type: requestedType } = req.body;
    
    // If fileId provided, get content from DB
    let content = scadContent;
    let fileType = requestedType;
    let jobIdPrefix = fileId || 'unsaved';

    if (fileId) {
        const stmt = db.prepare('SELECT content, type FROM files WHERE id = ? AND user_id = ?');
        const file: any = stmt.get(fileId, user.id);
        if (!file) return res.status(404).json({ error: 'File not found' });
        
        // If it's an uploaded file (STL/OBJ/3MF), 'content' is the filename
        if (file.type === 'stl' || file.type === 'obj' || file.type === '3mf') {
            if (requestedType === 'gcode') {
                content = null; // We are slicing the mesh directly
                jobIdPrefix = file.content; // Use the actual filename from RENDER_DIR
            } else {
                return res.json({
                    status: 'completed',
                    url: `/renders/${file.content}`,
                    metadata: null
                });
            }
        } else {
            // SCAD file
            if (!content) content = file.content;
            if (!fileType) fileType = file.type;
        }
    }

    try {
        const job = await renderQueue.add('render', { 
            scadContent: content,
            fileId: jobIdPrefix,
            params, 
            options, 
            type: requestedType || (isPreview ? 'preview' : 'obj') 
        });

        const result: any = await job.waitUntilFinished(queueEvents, 60000); 
        
        const filename = result.filename || result; // Handle legacy string return just in case
        const metadata = result.metadata || null;

        // If not preview, save to history
        if (!isPreview) {
            const insert = db.prepare('INSERT INTO renders (user_id, filename) VALUES (?, ?)');
            insert.run(user.id, filename);
            // ... (limit logic) ...
        }

        res.json({ 
            status: 'completed', 
            url: `/renders/${filename}`,
            metadata,
            jobId: job.id
        });
    } catch (err: any) {
        console.error("Render Error:", err);
        res.status(500).json({ error: 'Render failed', details: err.message });
    }
});

// --- Sharing Routes ---
app.post('/api/files/:id/share', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const token = uuidv4();
    
    const stmt = db.prepare('UPDATE files SET shared_token = ? WHERE id = ? AND user_id = ?');
    const info = stmt.run(token, req.params.id, user.id);
    
    if (info.changes === 0) return res.status(404).json({ error: 'File not found' });
    res.json({ token });
});

app.get('/api/share/:token', async (req, res) => {
    const { token } = req.params;
    const stmt = db.prepare('SELECT id, name, content, type FROM files WHERE shared_token = ?');
    const file: any = stmt.get(token);
    
    if (!file) return res.status(404).json({ error: 'Shared link not found' });
    
    res.json(file);
});


// Catch all for Client routing
app.get('*', (req, res) => {
    // If request accepts html
    if (req.accepts('html')) {
        res.sendFile(path.join(CLIENT_BUILD, 'index.html'));
    } else {
        res.status(404).send('Not found');
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

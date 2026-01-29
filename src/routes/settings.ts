import express from 'express';
import db from '../db';
import { authenticateToken, AuthRequest } from '../auth';

const router = express.Router();

// --- Printers ---
router.get('/printers', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const stmt = db.prepare('SELECT id, name, power_watts FROM printers WHERE user_id = ?');
    res.json(stmt.all(user.id));
});

router.post('/printers', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const { name, power_watts, config_content } = req.body;
    const stmt = db.prepare('INSERT INTO printers (user_id, name, power_watts, config_content) VALUES (?, ?, ?, ?)');
    const info = stmt.run(user.id, name, power_watts, config_content || '');
    res.json({ id: info.lastInsertRowid });
});

router.delete('/printers/:id', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const stmt = db.prepare('DELETE FROM printers WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, user.id);
    res.sendStatus(200);
});

// --- Filaments ---
router.get('/filaments', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const stmt = db.prepare('SELECT * FROM filaments WHERE user_id = ?');
    res.json(stmt.all(user.id));
});

router.post('/filaments', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const { name, density, cost_per_kg, diameter } = req.body;
    const stmt = db.prepare('INSERT INTO filaments (user_id, name, density, cost_per_kg, diameter) VALUES (?, ?, ?, ?, ?)');
    const info = stmt.run(user.id, name, density, cost_per_kg, diameter);
    res.json({ id: info.lastInsertRowid });
});

router.delete('/filaments/:id', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const stmt = db.prepare('DELETE FROM filaments WHERE id = ? AND user_id = ?');
    stmt.run(req.params.id, user.id);
    res.sendStatus(200);
});

// --- Settings ---
router.get('/settings', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const stmt = db.prepare('SELECT * FROM user_settings WHERE user_id = ?');
    const settings = stmt.get(user.id);
    res.json(settings || { electricity_cost_kwh: 0.15, vat_rate: 20.0, currency_symbol: '$' });
});

router.post('/settings', authenticateToken, (req, res) => {
    const user = (req as AuthRequest).user!;
    const { electricity_cost_kwh, vat_rate, currency_symbol } = req.body;
    
    const stmt = db.prepare(`
        INSERT INTO user_settings (user_id, electricity_cost_kwh, vat_rate, currency_symbol) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET 
            electricity_cost_kwh = excluded.electricity_cost_kwh,
            vat_rate = excluded.vat_rate,
            currency_symbol = excluded.currency_symbol
    `);
    
    stmt.run(user.id, electricity_cost_kwh, vat_rate, currency_symbol);
    res.sendStatus(200);
});

export default router;

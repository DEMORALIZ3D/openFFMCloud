const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');
const path = require('path');
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));

if (!args.username || !args.password) {
    console.error('Usage: node scripts/create_user.js --username <username> --password <password>');
    process.exit(1);
}

const DB_PATH = path.resolve(__dirname, '../data/scad.db');
const db = new Database(DB_PATH);

async function createUser() {
    try {
        const hash = await bcrypt.hash(args.password, 10);
        const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
        const info = stmt.run(args.username, hash);
        console.log(`User '${args.username}' created successfully with ID ${info.lastInsertRowid}`);
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            console.error(`Error: User '${args.username}' already exists.`);
        } else {
            console.error('Failed to create user:', e);
        }
    }
}

createUser();

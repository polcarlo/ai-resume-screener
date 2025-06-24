import os
import sqlite3
from flask import g

DB_PATH = 'resume_screener.db'
SCHEMA = '''
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    created_at TEXT NOT NULL,
    title TEXT
);
CREATE TABLE IF NOT EXISTS candidate_names (
    filename TEXT PRIMARY KEY,
    name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    filename TEXT NOT NULL REFERENCES candidate_names(filename),
    similarity_pct REAL NOT NULL,
    skills TEXT,
    experience TEXT,
    education TEXT,
    certifications TEXT,
    keywords TEXT,
    reviewed BOOLEAN DEFAULT 0
);
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    similarity_threshold REAL DEFAULT 75.0,
    auto_rank BOOLEAN DEFAULT 1,
    dark_mode BOOLEAN DEFAULT 0
);
INSERT OR IGNORE INTO settings (id) VALUES (1);
'''


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH, detect_types=sqlite3.PARSE_DECLTYPES)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(e=None):
    db = g.pop('db', None)
    if db:
        db.close()


def init_db(app):
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    app.teardown_appcontext(close_db)
    with app.app_context():
        db = get_db()
        db.executescript(SCHEMA)
        db.commit()
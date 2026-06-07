"""
Database module for E-Display backend.
Uses SQLite for zero-setup local development.
To switch to PostgreSQL for production, change the connection logic.
"""

import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "edisplay.db")


def get_connection():
    """Get a database connection with row factory."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create tables if they don't exist, and migrate any existing JSON files."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS timetables (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_name TEXT UNIQUE NOT NULL,
            data TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (class_name) REFERENCES classes(name) ON DELETE CASCADE
        )
    """)

    conn.commit()

    # ── Migrate existing JSON files into the database ──
    _migrate_json_files(conn)

    conn.close()


def _migrate_json_files(conn):
    """One-time migration: import any existing JSON timetable files into SQLite."""
    json_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "timetables")
    if not os.path.isdir(json_dir):
        return

    cursor = conn.cursor()
    migrated = 0

    for filename in os.listdir(json_dir):
        if not filename.endswith(".json"):
            continue

        class_name = filename.replace(".json", "")
        filepath = os.path.join(json_dir, filename)

        # Skip if already in DB
        row = cursor.execute("SELECT id FROM classes WHERE name = ?", (class_name,)).fetchone()
        if row:
            continue

        try:
            with open(filepath, "r", encoding="utf-8") as f:
                data = json.load(f)

            updated_at = data.get("updatedAt", datetime.now(timezone.utc).isoformat())
            cursor.execute("INSERT INTO classes (name) VALUES (?)", (class_name,))
            cursor.execute(
                "INSERT INTO timetables (class_name, data, updated_at) VALUES (?, ?, ?)",
                (class_name, json.dumps(data), updated_at),
            )
            migrated += 1
        except Exception as e:
            print(f"⚠️  Failed to migrate {filename}: {e}")

    if migrated:
        conn.commit()
        print(f"✅ Migrated {migrated} JSON timetable(s) into SQLite database")


# ─── CRUD Operations ───────────────────────────────────────

def get_all_classes():
    """Return list of class dicts: [{name, created_at, updated_at}, ...]"""
    conn = get_connection()
    rows = conn.execute("""
        SELECT c.name, c.created_at,
               COALESCE(t.updated_at, c.created_at) as updated_at
        FROM classes c
        LEFT JOIN timetables t ON c.name = t.class_name
        ORDER BY c.name
    """).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_timetable(class_name):
    """Return timetable data dict for a class, or empty dict if not found."""
    conn = get_connection()
    row = conn.execute(
        "SELECT data FROM timetables WHERE class_name = ?", (class_name,)
    ).fetchone()
    conn.close()

    if row:
        return json.loads(row["data"])
    return {}


def save_timetable(class_name, data):
    """Save/update timetable data for a class. Creates the class if it doesn't exist."""
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()

    # Ensure class exists
    cursor.execute("INSERT OR IGNORE INTO classes (name) VALUES (?)", (class_name,))

    # Upsert timetable
    cursor.execute("""
        INSERT INTO timetables (class_name, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(class_name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    """, (class_name, json.dumps(data), now))

    conn.commit()
    conn.close()
    return now


def create_class(class_name):
    """Create a new class entry. Returns True if created, False if already exists."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO classes (name) VALUES (?)", (class_name,))
        conn.commit()
        conn.close()
        return True
    except sqlite3.IntegrityError:
        conn.close()
        return False


def delete_class(class_name):
    """Delete a class and its timetable. Returns True if deleted."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetables WHERE class_name = ?", (class_name,))
    cursor.execute("DELETE FROM classes WHERE name = ?", (class_name,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

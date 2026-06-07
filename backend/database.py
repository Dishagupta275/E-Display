import sqlite3
import json
import os
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "edisplay.db")


def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
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

    # Notices table — single row, stores JSON array of notice strings
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notices (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            data TEXT NOT NULL DEFAULT '[]',
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    # Class settings table — one row per class
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS class_settings (
            class_name TEXT PRIMARY KEY,
            data TEXT NOT NULL DEFAULT '{}',
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)

    conn.commit()
    _migrate_json_files(conn)
    conn.close()


def _migrate_json_files(conn):
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
        print(f"✅ Migrated {migrated} JSON timetable(s) into SQLite")


# ── Classes ────────────────────────────────────────────────

def get_all_classes():
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


def create_class(class_name):
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM timetables WHERE class_name = ?", (class_name,))
    cursor.execute("DELETE FROM classes WHERE name = ?", (class_name,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ── Timetables ─────────────────────────────────────────────

def get_timetable(class_name):
    conn = get_connection()
    row = conn.execute(
        "SELECT data FROM timetables WHERE class_name = ?", (class_name,)
    ).fetchone()
    conn.close()
    return json.loads(row["data"]) if row else {}


def save_timetable(class_name, data):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now(timezone.utc).isoformat()
    cursor.execute("INSERT OR IGNORE INTO classes (name) VALUES (?)", (class_name,))
    cursor.execute("""
        INSERT INTO timetables (class_name, data, updated_at)
        VALUES (?, ?, ?)
        ON CONFLICT(class_name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    """, (class_name, json.dumps(data), now))
    conn.commit()
    conn.close()
    return now



# ── Class Settings ─────────────────────────────────────────

DEFAULT_SETTINGS = {
    "collegeName": "SPHOORTHY ENGINEERING COLLEGE",
    "academicYear": "2024-2025",
    "yearSemester": "2ND YEAR B.TECH 1ST SEMESTER",
    "classIncharge": "DR. KAJA MASTHAN AND D. MAMATHA REDDY",
    "lectureHall": "406",
    "events": ["Seminar", "Workshop", "Exam"],
}

def get_class_settings(class_name):
    conn = get_connection()
    row = conn.execute(
        "SELECT data FROM class_settings WHERE class_name = ?", (class_name,)
    ).fetchone()
    conn.close()
    if row:
        saved = json.loads(row["data"])
        return {**DEFAULT_SETTINGS, **saved}
    return dict(DEFAULT_SETTINGS)


def save_class_settings(class_name, data):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("""
        INSERT INTO class_settings (class_name, data, updated_at) VALUES (?, ?, ?)
        ON CONFLICT(class_name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    """, (class_name, json.dumps(data), now))
    conn.commit()
    conn.close()


def get_notices():
    conn = get_connection()
    row = conn.execute("SELECT data FROM notices WHERE id = 1").fetchone()
    conn.close()
    return json.loads(row["data"]) if row else []


def save_notices(notices_list):
    conn = get_connection()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute("""
        INSERT INTO notices (id, data, updated_at) VALUES (1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at
    """, (json.dumps(notices_list), now))
    conn.commit()
    conn.close()

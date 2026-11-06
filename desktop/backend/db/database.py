import sqlite3
import json
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = Path(__file__).parent / "lily.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profile (
            id INTEGER PRIMARY KEY,
            full_name TEXT,
            email TEXT,
            phone TEXT,
            address TEXT,
            skills TEXT,
            education TEXT,
            experience TEXT,
            resume_path TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            tool_used TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS saved_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL,
            title TEXT,
            content TEXT,
            source TEXT,
            status TEXT DEFAULT 'pending',
            remind_at DATETIME,
            synced_to TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            due_date DATETIME,
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS action_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            details TEXT,
            success BOOLEAN DEFAULT 1,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


def save_user_profile(data: Dict[str, Any]) -> bool:
    conn = get_connection()
    cursor = conn.cursor()

    fields = ["full_name", "email", "phone", "address", "skills", "education", "experience", "resume_path"]
    values = {k: data.get(k) for k in fields}
    values["updated_at"] = datetime.now().isoformat()

    cursor.execute("SELECT id FROM user_profile LIMIT 1")
    existing = cursor.fetchone()

    if existing:
        set_clause = ", ".join([f"{k} = ?" for k in values.keys()])
        cursor.execute(f"UPDATE user_profile SET {set_clause} WHERE id = ?", list(values.values()) + [existing["id"]])
    else:
        columns = ", ".join(values.keys())
        placeholders = ", ".join(["?"] * len(values))
        cursor.execute(f"INSERT INTO user_profile ({columns}) VALUES ({placeholders})", list(values.values()))

    conn.commit()
    conn.close()
    return True


def get_user_profile() -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM user_profile LIMIT 1")
    row = cursor.fetchone()
    conn.close()

    if row:
        return dict(row)
    return None


def add_conversation(role: str, content: str, tool_used: Optional[str] = None):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO conversations (role, content, tool_used) VALUES (?, ?, ?)", (role, content, tool_used))
    conn.commit()
    conn.close()


def get_conversation_history(limit: int = 20) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_task(title: str, description: str = "", due_date: Optional[str] = None, priority: str = "medium") -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO tasks (title, description, due_date, priority) VALUES (?, ?, ?, ?)", 
                   (title, description, due_date, priority))
    task_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return task_id


def get_tasks(status: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if status:
        cursor.execute("SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC", (status,))
    else:
        cursor.execute("SELECT * FROM tasks ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def update_task_status(task_id: int, status: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE tasks SET status = ? WHERE id = ?", (status, task_id))
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success


def save_item(item_type: str, title: str, content: str, source: str = "") -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO saved_items (type, title, content, source) VALUES (?, ?, ?, ?)",
                   (item_type, title, content, source))
    item_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return item_id


def get_saved_items(item_type: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if item_type:
        cursor.execute("SELECT * FROM saved_items WHERE type = ? ORDER BY created_at DESC", (item_type,))
    else:
        cursor.execute("SELECT * FROM saved_items ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def log_action(action: str, details: str = "", success: bool = True):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO action_log (action, details, success) VALUES (?, ?, ?)", (action, details, success))
    conn.commit()
    conn.close()


init_db()
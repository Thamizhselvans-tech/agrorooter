import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from .config import settings

def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(settings.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                predicted_class TEXT NOT NULL,
                plant TEXT NOT NULL,
                disease TEXT NOT NULL,
                confidence REAL NOT NULL,
                is_tomato INTEGER NOT NULL,
                tomato_confidence REAL,
                top_predictions TEXT NOT NULL,
                tomato_top_predictions TEXT,
                image_filename TEXT,
                image_url TEXT,
                thumbnail_base64 TEXT,
                source TEXT DEFAULT 'camera'
            )
        """)
        cursor.execute("PRAGMA table_info(predictions)")
        cols = [col[1] for col in cursor.fetchall()]
        if "thumbnail_base64" not in cols:
            cursor.execute("ALTER TABLE predictions ADD COLUMN thumbnail_base64 TEXT")
        conn.commit()
    finally:
        conn.close()

def save_prediction(
    predicted_class: str,
    plant: str,
    disease: str,
    confidence: float,
    is_tomato: bool,
    top_predictions: List[Dict[str, Any]],
    tomato_top_predictions: Optional[List[Dict[str, Any]]] = None,
    tomato_confidence: Optional[float] = None,
    image_filename: Optional[str] = None,
    image_url: Optional[str] = None,
    thumbnail_base64: Optional[str] = None,
    source: str = "camera",
    timestamp: Optional[str] = None
) -> int:
    if timestamp is None:
        timestamp = datetime.utcnow().isoformat() + "Z"
        
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO predictions (
                timestamp, predicted_class, plant, disease, confidence,
                is_tomato, tomato_confidence, top_predictions, tomato_top_predictions,
                image_filename, image_url, thumbnail_base64, source
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            timestamp,
            predicted_class,
            plant,
            disease,
            confidence,
            1 if is_tomato else 0,
            tomato_confidence,
            json.dumps(top_predictions),
            json.dumps(tomato_top_predictions) if tomato_top_predictions else None,
            image_filename,
            image_url,
            thumbnail_base64,
            source
        ))
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def get_predictions(limit: int = 50, offset: int = 0, plant_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = "SELECT * FROM predictions"
        params = []
        if plant_filter:
            query += " WHERE LOWER(plant) = LOWER(?)"
            params.append(plant_filter)
        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        results = []
        for row in rows:
            d = dict(row)
            d["is_tomato"] = bool(d["is_tomato"])
            d["top_predictions"] = json.loads(d["top_predictions"]) if d["top_predictions"] else []
            d["tomato_top_predictions"] = json.loads(d["tomato_top_predictions"]) if d["tomato_top_predictions"] else []
            results.append(d)
        return results
    finally:
        conn.close()

def get_prediction_by_id(prediction_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM predictions WHERE id = ?", (prediction_id,))
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["is_tomato"] = bool(d["is_tomato"])
        d["top_predictions"] = json.loads(d["top_predictions"]) if d["top_predictions"] else []
        d["tomato_top_predictions"] = json.loads(d["tomato_top_predictions"]) if d["tomato_top_predictions"] else []
        return d
    finally:
        conn.close()

def get_prediction_stats() -> Dict[str, Any]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM predictions")
        total = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM predictions WHERE is_tomato = 1")
        tomato_total = cursor.fetchone()[0]
        
        cursor.execute("SELECT predicted_class, COUNT(*) as c FROM predictions GROUP BY predicted_class ORDER BY c DESC LIMIT 5")
        top_diagnoses = [{"class_name": r[0], "count": r[1]} for r in cursor.fetchall()]
        
        return {
            "total_predictions": total,
            "tomato_predictions": tomato_total,
            "top_diagnoses": top_diagnoses
        }
    finally:
        conn.close()

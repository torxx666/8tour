import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "scores.db")

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS leaderboard (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            player_name TEXT NOT NULL,
            score_blue INTEGER NOT NULL,
            score_orange INTEGER NOT NULL,
            winner INTEGER NOT NULL,
            date TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

def add_score(player_name, score_blue, score_orange, winner):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO leaderboard (player_name, score_blue, score_orange, winner, date)
        VALUES (?, ?, ?, ?, ?)
    """, (player_name, score_blue, score_orange, winner, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit()
    conn.close()

def get_leaderboard(limit=10):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    # On trie par la différence de score la plus grande (victoire écrasante)
    # ou simplement par date pour voir les derniers exploits
    cursor.execute("""
        SELECT player_name, score_blue, score_orange, winner, date 
        FROM leaderboard 
        ORDER BY MAX(score_blue, score_orange) DESC, date DESC 
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {
            "player_name": r[0],
            "score_blue": r[1],
            "score_orange": r[2],
            "winner": r[3],
            "date": r[4]
        } for r in rows
    ]

if __name__ == "__main__":
    init_db()

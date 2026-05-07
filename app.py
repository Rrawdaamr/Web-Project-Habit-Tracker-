from flask import Flask, render_template, request, jsonify
from datetime import date, datetime, timedelta
import sqlite3
import os

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(__file__), "habits.db")


# ─────────────────────────── DATABASE SETUP ──────────────────────────────────

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS habits (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            icon        TEXT    NOT NULL DEFAULT '⭐',
            time_of_day TEXT    NOT NULL DEFAULT 'في أي وقت',
            color       TEXT    NOT NULL DEFAULT '#EAF3DE',
            created_at  TEXT    NOT NULL DEFAULT (date('now')),
            is_active   INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS completions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            habit_id   INTEGER NOT NULL REFERENCES habits(id),
            done_date  TEXT    NOT NULL,
            xp_earned  INTEGER NOT NULL DEFAULT 10,
            UNIQUE(habit_id, done_date)
        );

        CREATE TABLE IF NOT EXISTS moods (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            mood_date TEXT    NOT NULL UNIQUE,
            emoji     TEXT    NOT NULL,
            label     TEXT    NOT NULL
        );
    """)
    # Seed some default habits if empty
    cur = conn.execute("SELECT COUNT(*) FROM habits")
    if cur.fetchone()[0] == 0:
        seeds = [
            ("تمرين رياضي",      "🏃", "صباحاً",    "#EAF3DE"),
            ("قراءة 30 دقيقة",   "📚", "مساءً",     "#EEEDFE"),
            ("شرب 8 أكواب ماء",  "💧", "في أي وقت", "#E1F5EE"),
            ("التأمل",           "🧘", "صباحاً",    "#FAEEDA"),
            ("تعلم شيء جديد",   "🎯", "ظهراً",     "#FAECE7"),
        ]
        conn.executemany(
            "INSERT INTO habits (name, icon, time_of_day, color) VALUES (?,?,?,?)", seeds
        )
    conn.commit()
    conn.close()


# ─────────────────────────── HELPERS ─────────────────────────────────────────

def calc_streak(habit_id: int, conn) -> int:
    rows = conn.execute(
        "SELECT done_date FROM completions WHERE habit_id=? ORDER BY done_date DESC",
        (habit_id,)
    ).fetchall()
    if not rows:
        return 0
    streak = 0
    check = date.today()
    for row in rows:
        d = date.fromisoformat(row["done_date"])
        if d == check:
            streak += 1
            check -= timedelta(days=1)
        elif d == check - timedelta(days=1):
            # Allow yesterday to continue streak
            streak += 1
            check = d - timedelta(days=1)
        else:
            break
    return streak


def total_xp(conn) -> int:
    row = conn.execute("SELECT COALESCE(SUM(xp_earned),0) AS s FROM completions").fetchone()
    return row["s"]


# ─────────────────────────── ROUTES ──────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


# ── Habits ──

@app.route("/api/habits", methods=["GET"])
def get_habits():
    today = str(date.today())
    conn = get_db()
    habits = conn.execute(
        "SELECT * FROM habits WHERE is_active=1 ORDER BY id"
    ).fetchall()
    result = []
    for h in habits:
        done = conn.execute(
            "SELECT 1 FROM completions WHERE habit_id=? AND done_date=?",
            (h["id"], today)
        ).fetchone() is not None
        streak = calc_streak(h["id"], conn)
        result.append({
            "id":          h["id"],
            "name":        h["name"],
            "icon":        h["icon"],
            "time_of_day": h["time_of_day"],
            "color":       h["color"],
            "done":        done,
            "streak":      streak,
        })
    conn.close()
    return jsonify(result)


@app.route("/api/habits", methods=["POST"])
def add_habit():
    data = request.json
    name  = data.get("name", "").strip()
    icon  = data.get("icon", "⭐")
    time_ = data.get("time_of_day", "في أي وقت")
    color = data.get("color", "#EAF3DE")
    if not name:
        return jsonify({"error": "الاسم مطلوب"}), 400
    conn = get_db()
    cur = conn.execute(
        "INSERT INTO habits (name, icon, time_of_day, color) VALUES (?,?,?,?)",
        (name, icon, time_, color)
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({"id": new_id, "name": name, "icon": icon,
                    "time_of_day": time_, "color": color, "done": False, "streak": 0}), 201


@app.route("/api/habits/<int:habit_id>", methods=["DELETE"])
def delete_habit(habit_id):
    conn = get_db()
    conn.execute("UPDATE habits SET is_active=0 WHERE id=?", (habit_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ── Completions (toggle) ──

@app.route("/api/complete/<int:habit_id>", methods=["POST"])
def toggle_complete(habit_id):
    today = str(date.today())
    conn  = get_db()
    existing = conn.execute(
        "SELECT id FROM completions WHERE habit_id=? AND done_date=?",
        (habit_id, today)
    ).fetchone()
    if existing:
        conn.execute("DELETE FROM completions WHERE id=?", (existing["id"],))
        done = False
        xp_delta = -10
    else:
        conn.execute(
            "INSERT INTO completions (habit_id, done_date, xp_earned) VALUES (?,?,10)",
            (habit_id, today)
        )
        done = True
        xp_delta = 10
    conn.commit()
    streak = calc_streak(habit_id, conn)
    xp     = total_xp(conn)
    conn.close()
    return jsonify({"done": done, "streak": streak, "xp": xp, "xp_delta": xp_delta})


# ── Stats & Progress ──

@app.route("/api/stats")
def get_stats():
    conn  = get_db()
    today = date.today()

    # Total XP
    xp = total_xp(conn)

    # Best streak across all habits
    habits = conn.execute("SELECT id FROM habits WHERE is_active=1").fetchall()
    best_streak = max((calc_streak(h["id"], conn) for h in habits), default=0)

    # Completion rate last 30 days
    habit_count = len(habits)
    if habit_count:
        start = str(today - timedelta(days=29))
        done_days = conn.execute(
            "SELECT COUNT(DISTINCT done_date) FROM completions WHERE done_date >= ?",
            (start,)
        ).fetchone()[0]
        rate = round((done_days / 30) * 100)
    else:
        rate = 0

    # Days completed this month
    month_start = today.replace(day=1).isoformat()
    month_days = conn.execute(
        "SELECT COUNT(DISTINCT done_date) FROM completions WHERE done_date >= ?",
        (month_start,)
    ).fetchone()[0]

    conn.close()
    return jsonify({
        "xp":          xp,
        "best_streak": best_streak,
        "rate":        rate,
        "month_days":  month_days,
    })


@app.route("/api/heatmap")
def get_heatmap():
    """Return completion count per day for the last 91 days (13 weeks)."""
    start = str(date.today() - timedelta(days=90))
    conn  = get_db()
    rows  = conn.execute(
        """SELECT done_date, COUNT(DISTINCT habit_id) AS cnt
           FROM completions
           WHERE done_date >= ?
           GROUP BY done_date""",
        (start,)
    ).fetchall()
    conn.close()
    return jsonify({r["done_date"]: r["cnt"] for r in rows})


@app.route("/api/weekly")
def get_weekly():
    """Return completion counts for the last 7 days."""
    conn = get_db()
    result = []
    for i in range(6, -1, -1):
        d = date.today() - timedelta(days=i)
        row = conn.execute(
            "SELECT COUNT(*) AS cnt FROM completions WHERE done_date=?",
            (str(d),)
        ).fetchone()
        result.append({"date": str(d), "count": row["cnt"]})
    conn.close()
    return jsonify(result)


# ── Mood ──

@app.route("/api/mood", methods=["POST"])
def save_mood():
    data  = request.json
    today = str(date.today())
    emoji = data.get("emoji", "🙂")
    label = data.get("label", "")
    conn  = get_db()
    conn.execute(
        "INSERT INTO moods (mood_date, emoji, label) VALUES (?,?,?) "
        "ON CONFLICT(mood_date) DO UPDATE SET emoji=excluded.emoji, label=excluded.label",
        (today, emoji, label)
    )
    conn.commit()
    conn.close()
    return jsonify({"ok": True, "date": today, "emoji": emoji})


@app.route("/api/mood/today")
def today_mood():
    conn = get_db()
    row  = conn.execute(
        "SELECT emoji, label FROM moods WHERE mood_date=?", (str(date.today()),)
    ).fetchone()
    conn.close()
    if row:
        return jsonify({"emoji": row["emoji"], "label": row["label"]})
    return jsonify({"emoji": None, "label": None})


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
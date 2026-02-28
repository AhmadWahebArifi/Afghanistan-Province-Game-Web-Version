from flask import Flask, render_template, request, jsonify, send_from_directory
import csv
import os
import re

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CSV_PATH = os.path.join(BASE_DIR, "Afghanistan_Provinces.csv")

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "templates"),
    static_folder=os.path.join(BASE_DIR, "static"),
    static_url_path="/static",
)


def _load_provinces():
    provinces = []
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            provinces.append(
                {
                    "state": row.get("state", "").strip(),
                    "x": int(float(row.get("x", 0))),
                    "y": int(float(row.get("y", 0))),
                }
            )
    return provinces


def _norm_name(value: str) -> str:
    value = (value or "").strip().lower()
    value = value.replace("-", " ")
    value = re.sub(r"\s+", " ", value)
    return value


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/provinces")
def get_provinces():
    try:
        return jsonify(_load_provinces())
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/check")
def check_province():
    try:
        payload = request.get_json(silent=True) or {}
        answer_raw = str(payload.get("answer", ""))
        answer_norm = _norm_name(answer_raw)

        provinces = _load_provinces()
        for p in provinces:
            if _norm_name(p["state"]) == answer_norm:
                return jsonify({"correct": True, "x": p["x"], "y": p["y"], "name": p["state"]})

        return jsonify({"correct": False})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.post("/api/save_progress")
def save_progress():
    try:
        payload = request.get_json(silent=True) or {}
        guessed = payload.get("guessed", [])
        if not isinstance(guessed, list):
            guessed = []

        provinces = _load_provinces()
        all_states = [p["state"] for p in provinces]
        missed = [s for s in all_states if s not in guessed]

        return jsonify({"success": True, "missed_count": len(missed), "missed": missed})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.get("/blank_states.gif")
def blank_map():
    return send_from_directory(BASE_DIR, "blank_states.gif")

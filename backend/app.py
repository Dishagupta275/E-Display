from flask import Flask, request, jsonify
from flask_cors import CORS
import json

from mqtt_publisher import publish_timetable, publish_notices, publish_settings
from database import (init_db, get_all_classes, get_timetable, save_timetable,
                      create_class, delete_class, get_notices, save_notices,
                      get_class_settings, save_class_settings)

app = Flask(__name__)
CORS(app)

init_db()


# =========================================================
# CLASSES
# =========================================================
@app.route("/api/classes", methods=["GET"])
def api_get_classes():
    return jsonify(get_all_classes()), 200

@app.route("/api/classes", methods=["POST"])
def api_create_class():
    body = request.json or {}
    name = (body.get("name") or "").strip().upper()
    if not name:
        return jsonify({"status": "error", "message": "Class name is required"}), 400
    if len(name) > 20:
        return jsonify({"status": "error", "message": "Class name too long (max 20 chars)"}), 400
    created = create_class(name)
    if not created:
        return jsonify({"status": "error", "message": f"Class '{name}' already exists"}), 409
    return jsonify({"status": "ok", "message": f"Class '{name}' created"}), 201

@app.route("/api/classes/<class_name>", methods=["DELETE"])
def api_delete_class(class_name):
    deleted = delete_class(class_name)
    if not deleted:
        return jsonify({"status": "error", "message": "Class not found"}), 404
    return jsonify({"status": "ok", "message": f"Class '{class_name}' deleted"}), 200


# =========================================================
# TIMETABLE
# =========================================================
@app.route("/api/timetable/<class_name>", methods=["GET"])
def api_get_timetable(class_name):
    return jsonify(get_timetable(class_name)), 200

@app.route("/api/timetable/<class_name>", methods=["POST"])
def api_save_timetable(class_name):
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    try:
        updated_at = save_timetable(class_name, data)
        return jsonify({"status": "ok", "message": "saved", "updatedAt": updated_at}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route("/api/timetable/<class_name>/publish", methods=["POST"])
def publish_timetable_api(class_name):
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    try:
        save_timetable(class_name, data)
    except Exception as e:
        return jsonify({"status": "error", "message": f"Save failed: {e}"}), 500
    mqtt_status = "ok"
    try:
        publish_timetable(class_name, data)
    except Exception as e:
        mqtt_status = f"mqtt_error: {e}"
    return jsonify({"status": "ok", "message": "published", "mqtt": mqtt_status}), 200


# =========================================================
# NOTICES
# =========================================================
@app.route("/api/notices", methods=["GET"])
def api_get_notices():
    return jsonify(get_notices()), 200

@app.route("/api/notices", methods=["POST"])
def api_save_notices():
    data = request.json
    if not isinstance(data, list):
        return jsonify({"status": "error", "message": "Expected a list of notice strings"}), 400
    save_notices(data)
    return jsonify({"status": "ok", "message": "Notices saved"}), 200

@app.route("/api/notices/publish", methods=["POST"])
def api_publish_notices():
    body = request.json
    if not body:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    # Normalize: accept plain list of strings OR list of {text, target} objects
    if isinstance(body, list):
        if len(body) == 0:
            return jsonify({"status": "error", "message": "No notices provided"}), 400
        if isinstance(body[0], str):
            # old format — wrap each as {text, target: "all"}
            notices = [{"text": t, "target": "all"} for t in body if t.strip()]
        else:
            notices = [n for n in body if n.get("text", "").strip()]
    else:
        return jsonify({"status": "error", "message": "Expected a list"}), 400

    if not notices:
        return jsonify({"status": "error", "message": "No valid notices"}), 400

    save_notices(notices)

    try:
        publish_notices(notices)
    except Exception as e:
        return jsonify({"status": "ok", "message": "saved", "mqtt": f"error: {e}"}), 200

    return jsonify({"status": "ok", "message": f"Published {len(notices)} notice(s)"}), 200


# =========================================================
# CLASS SETTINGS
# =========================================================
@app.route("/api/settings/<class_name>", methods=["GET"])
def api_get_settings(class_name):
    return jsonify(get_class_settings(class_name)), 200

@app.route("/api/settings/<class_name>", methods=["POST"])
def api_save_settings(class_name):
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    save_class_settings(class_name, data)
    return jsonify({"status": "ok", "message": "Settings saved"}), 200

@app.route("/api/settings/<class_name>/publish", methods=["POST"])
def api_publish_settings(class_name):
    data = request.json
    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400
    save_class_settings(class_name, data)
    try:
        publish_settings(class_name, data)
    except Exception as e:
        return jsonify({"status": "ok", "message": "saved", "mqtt": f"error: {e}"}), 200
    return jsonify({"status": "ok", "message": "Settings published"}), 200


# =========================================================
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "E-Display Backend"}), 200

@app.route("/")
def index():
    return "E-Display Backend is running", 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

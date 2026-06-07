from flask import Flask, request, jsonify
from flask_cors import CORS
import json

from mqtt_publisher import publish_timetable
from database import init_db, get_all_classes, get_timetable, save_timetable, create_class, delete_class

app = Flask(__name__)
CORS(app)

# ── Initialize database on startup ──
init_db()


# =========================================================
# GET LIST OF CLASSES  (enhanced: returns objects with metadata)
# =========================================================
@app.route("/api/classes", methods=["GET"])
def api_get_classes():
    classes = get_all_classes()
    return jsonify(classes), 200


# =========================================================
# CREATE A NEW CLASS
# =========================================================
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

    print(f"🆕 Class created: {name}")
    return jsonify({"status": "ok", "message": f"Class '{name}' created"}), 201


# =========================================================
# DELETE A CLASS
# =========================================================
@app.route("/api/classes/<class_name>", methods=["DELETE"])
def api_delete_class(class_name):
    deleted = delete_class(class_name)
    if not deleted:
        return jsonify({"status": "error", "message": "Class not found"}), 404

    print(f"🗑️  Class deleted: {class_name}")
    return jsonify({"status": "ok", "message": f"Class '{class_name}' deleted"}), 200


# =========================================================
# GET TIMETABLE FOR A CLASS
# =========================================================
@app.route("/api/timetable/<class_name>", methods=["GET"])
def api_get_timetable(class_name):
    data = get_timetable(class_name)
    return jsonify(data), 200


# =========================================================
# SAVE TIMETABLE (NO MQTT)
# =========================================================
@app.route("/api/timetable/<class_name>", methods=["POST"])
def api_save_timetable(class_name):
    data = request.json

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    try:
        updated_at = save_timetable(class_name, data)
        print(f"💾 Timetable saved for {class_name}")
        return jsonify({
            "status": "ok",
            "message": "saved",
            "updatedAt": updated_at
        }), 200
    except Exception as e:
        print(f"❌ Save failed for {class_name}: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500


# =========================================================
# SAVE + PUBLISH TIMETABLE (MQTT)
# =========================================================
@app.route("/api/timetable/<class_name>/publish", methods=["POST"])
def publish_timetable_api(class_name):
    data = request.json

    if not data:
        return jsonify({"status": "error", "message": "No data provided"}), 400

    # 🔍 DEBUG LOGS
    print("\n==============================")
    print("📤 PUBLISH API HIT")
    print("📘 Class:", class_name)
    print("📦 Data received from publisher:")
    print(json.dumps(data, indent=2))
    print("==============================\n")

    # 1️⃣ Save to database
    try:
        save_timetable(class_name, data)
    except Exception as e:
        print(f"❌ DB save failed: {e}")
        return jsonify({"status": "error", "message": f"Save failed: {e}"}), 500

    # 2️⃣ Publish to MQTT (NON-BLOCKING)
    mqtt_status = "ok"
    try:
        publish_timetable(class_name, data)
        print("📡 MQTT published successfully")
    except Exception as e:
        print("❌ MQTT publish failed:", e)
        mqtt_status = f"mqtt_error: {e}"

    # 3️⃣ RETURN RESPONSE
    return jsonify({
        "status": "ok",
        "message": "published",
        "mqtt": mqtt_status
    }), 200


# =========================================================
# HEALTH CHECK
# =========================================================
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "E-Display Backend"}), 200


# =========================================================
# ROOT
# =========================================================
@app.route("/")
def index():
    return "E-Display Backend is running", 200


# =========================================================
# MAIN
# =========================================================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)

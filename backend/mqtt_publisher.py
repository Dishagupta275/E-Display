import os
import ssl
import json
import paho.mqtt.client as mqtt

BROKER   = os.environ.get("MQTT_BROKER",   "db89b31f17b343648adedb9f54f0aa40.s1.eu.hivemq.cloud")
PORT     = int(os.environ.get("MQTT_PORT",  "8883"))
USERNAME = os.environ.get("MQTT_USERNAME", "E-display")
PASSWORD = os.environ.get("MQTT_PASSWORD", "")  # ← NEVER hardcode. Set via env var.

def _get_client():
    if not PASSWORD:
        raise ValueError("MQTT_PASSWORD environment variable is not set")
    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set(tls_version=ssl.PROTOCOL_TLS)
    client.connect(BROKER, PORT, keepalive=60)
    return client

def publish_timetable(classname: str, payload: dict) -> None:
    client = _get_client()
    topic = f"edisplay/timetable/{classname}"
    result = client.publish(topic, json.dumps(payload), qos=1)
    result.wait_for_publish()
    client.disconnect()
    print(f"📡 Timetable published to {topic}")

def publish_settings(classname: str, settings: dict) -> None:
    client = _get_client()
    topic = f"edisplay/settings/{classname}"
    result = client.publish(topic, json.dumps(settings), qos=1)
    result.wait_for_publish()
    client.disconnect()
    print(f"📡 Settings published to {topic}")

def publish_notices(notices: list) -> None:
    client = _get_client()
    topic_map = {}
    for n in notices:
        text = n.get("text", "").strip()
        target = n.get("target", "all")
        if not text:
            continue
        if target == "all" or not target:
            topics = ["edisplay/notices"]
        else:
            topics = [f"edisplay/notices/{cls}" for cls in target]
        for topic in topics:
            topic_map.setdefault(topic, []).append(text)
    for topic, texts in topic_map.items():
        result = client.publish(topic, json.dumps(texts), qos=1)
        result.wait_for_publish()
        print(f"📡 Notices published to {topic}: {texts}")
    client.disconnect()

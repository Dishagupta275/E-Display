import os
import ssl
import json
import paho.mqtt.client as mqtt

BROKER   = os.environ.get("MQTT_BROKER",   "db89b31f17b343648adedb9f54f0aa40.s1.eu.hivemq.cloud")
PORT     = int(os.environ.get("MQTT_PORT",  "8883"))
USERNAME = os.environ.get("MQTT_USERNAME", "E-display")
PASSWORD = os.environ.get("MQTT_PASSWORD", "Sphoorthy1")


def _get_client():
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


def publish_notices(notices: list, target_classes: list = None) -> None:
    """
    Publish notices via MQTT.
    - If target_classes is None or empty → publish to global topic (all displays listen)
    - If target_classes is a list → publish to each class-specific topic
    """
    client = _get_client()

    if target_classes:
        # Per-class topics: edisplay/notices/CSEC, edisplay/notices/ECEA etc.
        for cls in target_classes:
            topic = f"edisplay/notices/{cls}"
            result = client.publish(topic, json.dumps(notices), qos=1)
            result.wait_for_publish()
            print(f"📡 Notices published to {topic}")
    else:
        # Global topic — all displays receive it
        topic = "edisplay/notices"
        result = client.publish(topic, json.dumps(notices), qos=1)
        result.wait_for_publish()
        print(f"📡 Notices published to {topic}")

    client.disconnect()

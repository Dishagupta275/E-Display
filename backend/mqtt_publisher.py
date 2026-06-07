import paho.mqtt.client as mqtt
import ssl
import json

BROKER = "db89b31f17b343648adedb9f54f0aa40.s1.eu.hivemq.cloud"
PORT = 8883
USERNAME = "E-display"
PASSWORD = "Sphoorthy1"
def publish_timetable(classname, payload):
    print("📤 Publishing to MQTT:", classname, payload)  # 👈 ADD THIS

    client = mqtt.Client()
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set(tls_version=ssl.PROTOCOL_TLS)
    client.connect(BROKER, PORT, keepalive=60)

    topic = f"edisplay/timetable/{classname}"
    client.publish(topic, json.dumps(payload), qos=1)

    client.disconnect()


import paho.mqtt.client as mqtt
import json
import ssl
from datetime import datetime

class MQTTPublisher:
    def __init__(self):
        self.broker       = "db89b31f17b343648adedb9f54f0aa40.s1.eu.hivemq.cloud"
        self.port         = 8883
        self.username     = "E-display"
        self.password     = "Sphoorthy1"
        self.client       = None
        self.is_connected = False

    def connect(self):
        """Connect to MQTT broker only if not already connected"""
        if self.is_connected and self.client:
            return  # ✅ Already connected, skip creating a new client
        try:
            self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1)
            self.client.username_pw_set(self.username, self.password)
            self.client.tls_set(
                ca_certs=None, certfile=None, keyfile=None,
                cert_reqs=ssl.CERT_REQUIRED,
                tls_version=ssl.PROTOCOL_TLSv1_2,
                ciphers=None
            )
            self.client.tls_insecure_set(False)
            self.client.on_connect    = self.on_connect
            self.client.on_disconnect = self.on_disconnect
            self.client.connect(self.broker, self.port, keepalive=60)
            self.client.loop_start()
            print(f"MQTT Client connecting to {self.broker}:{self.port}")
        except Exception as e:
            print(f"MQTT Connection Error: {str(e)}")
            self.is_connected = False

    def on_connect(self, client, userdata, flags, rc):
        """Callback when client connects to broker"""
        if rc == 0:
            print("MQTT: Successfully connected to broker")
            self.is_connected = True
        else:
            print(f"MQTT: Connection failed with code {rc}")
            self.is_connected = False

    def on_disconnect(self, client, userdata, rc):
        """Callback when client disconnects from broker"""
        if rc != 0:
            print(f"MQTT: Unexpected disconnection with code {rc}")
        self.is_connected = False

    def publish_timetable(self, class_display_name, timetable_data):
        """Publish timetable to MQTT broker"""
        if not self.is_connected:
            print("MQTT: Not connected, attempting to reconnect...")
            self.is_connected = False
            self.connect()

        try:
            topic   = f"edisplay/timetable/{class_display_name}"
            payload = json.dumps({
                'class':        class_display_name,
                'timetable':    timetable_data,
                'published_at': datetime.utcnow().isoformat()
            })

            result = self.client.publish(topic, payload, qos=1, retain=True)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print(f"MQTT: Published timetable for {class_display_name}")
            else:
                print(f"MQTT: Publish failed with code {result.rc}")

            return result.rc == mqtt.MQTT_ERR_SUCCESS
        except Exception as e:
            print(f"MQTT Publish Error: {str(e)}")
            return False

    def publish_notification(self, target, notification_data):
        """Publish notification to MQTT broker"""
        if not self.is_connected:
            print("MQTT: Not connected, attempting to reconnect...")
            self.is_connected = False
            self.connect()

        try:
            topic   = f"edisplay/notification/{target}"
            payload = json.dumps({
                'target':       target,
                'notification': notification_data,
                'published_at': datetime.utcnow().isoformat()
            })

            result = self.client.publish(topic, payload, qos=1, retain=True)

            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                print(f"MQTT: Published notification for {target}")
            else:
                print(f"MQTT: Publish failed with code {result.rc}")

            return result.rc == mqtt.MQTT_ERR_SUCCESS
        except Exception as e:
            print(f"MQTT Publish Error: {str(e)}")
            return False

    def disconnect(self):
        """Disconnect from MQTT broker"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            self.is_connected = False
            print("MQTT: Disconnected from broker")


# Global MQTT publisher instance
mqtt_publisher = MQTTPublisher()
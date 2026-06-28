import paho.mqtt.client as mqtt
import json
import ssl
import time
from datetime import datetime

class MQTTPublisher:
    def __init__(self):
        from dotenv import load_dotenv
        import os

        load_dotenv()

        self.broker   = os.getenv("MQTT_BROKER")
        self.port     = 8883
        self.username = os.getenv("MQTT_USERNAME")
        self.password = os.getenv("MQTT_PASSWORD")
        self.client   = None
        self.is_connected = False

    def connect(self, wait_timeout=5):
        """
        Connect to MQTT broker only if not already connected.

        ✅ FIX: self.client.connect() (paho-mqtt) is non-blocking — it kicks off
        the TCP/TLS handshake on a background thread (via loop_start()) and
        returns immediately. is_connected only flips to True later, inside the
        on_connect callback, once the handshake actually finishes.

        Previously this method returned right after calling self.client.connect(),
        so a caller doing `connect(); publish(...)` right after a cold start
        (e.g. right after a Render free-tier instance wakes from sleep) would
        often call publish() *before* the handshake completed — causing the
        publish to silently fail or get dropped. This is why live updates
        worked "sometimes" rather than consistently: a race condition, not a
        fully broken pipe.

        Now we poll self.is_connected for up to `wait_timeout` seconds before
        returning, so by the time connect() returns, the client is actually
        ready to publish (or we've given up and the caller can decide what to do).
        """
        if self.is_connected and self.client:
            return  # ✅ Already connected, skip creating a new client

        if not self.broker:
            print("MQTT: No MQTT_BROKER configured — skipping MQTT connection.")
            return

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

            # Wait (briefly) for on_connect to actually fire and flip is_connected,
            # instead of returning immediately and racing the publish that follows.
            waited = 0.0
            poll_interval = 0.1
            while not self.is_connected and waited < wait_timeout:
                time.sleep(poll_interval)
                waited += poll_interval

            if not self.is_connected:
                print(f"MQTT: Still not connected after waiting {wait_timeout}s — proceeding anyway, publish may fail.")
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
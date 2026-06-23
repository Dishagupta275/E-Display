#!/bin/bash
# ═══════════════════════════════════════════════════════════
# E-Display Kiosk Script for Raspberry Pi
# ═══════════════════════════════════════════════════════════

# ── EDIT THESE FOR EACH RASPBERRY PI ───────────────────────
DEVICE_EMAIL="room301@edisplay.com"
DEVICE_PASSWORD="YourPasswordHere"
DISPLAY_URL="https://e-display-subscriber.onrender.com"
# ────────────────────────────────────────────────────────────

echo "=== E-Display Kiosk Starting ==="

# Wait for internet
echo "Waiting for internet connection..."
until ping -c1 8.8.8.8 &>/dev/null; do
  echo "No internet, retrying in 5 seconds..."
  sleep 5
done
echo "Internet connected!"
sleep 5

# Disable screen blanking
xset s off
xset s noblank
xset -dpms

# Hide mouse cursor
unclutter -idle 0 &

# Function to launch Chromium and auto-login
launch_and_login() {
  chromium-browser \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --no-first-run \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --incognito \
    --window-size=1920,1080 \
    --window-position=0,0 \
    "${DISPLAY_URL}" &

  CHROMIUM_PID=$!
  echo "Chromium started (PID: $CHROMIUM_PID)"

  # Wait for page to fully load
  sleep 10

  # Auto-fill email
  xdotool type --clearmodifiers "${DEVICE_EMAIL}"
  sleep 0.5

  # Tab to password field
  xdotool key Tab
  sleep 0.5

  # Fill password
  xdotool type --clearmodifiers "${DEVICE_PASSWORD}"
  sleep 0.5

  # Submit form
  xdotool key Return
  echo "Login submitted!"
}

# Initial launch
launch_and_login

# Keep alive — restart if Chromium crashes
while true; do
  if ! kill -0 $CHROMIUM_PID 2>/dev/null; then
    echo "Chromium crashed! Restarting in 5 seconds..."
    sleep 5
    launch_and_login
  fi
  sleep 10
done

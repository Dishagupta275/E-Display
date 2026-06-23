# Raspberry Pi Setup Guide for E-Display

## Step 1 — Install Required Packages
```bash
sudo apt update
sudo apt install -y chromium-browser xdotool unclutter
```

## Step 2 — Copy the Script
Copy `edisplay-kiosk.sh` to the Raspberry Pi and edit the credentials:
```bash
nano edisplay-kiosk.sh
```
Change these two lines for each device:
```bash
DEVICE_EMAIL="room301@edisplay.com"
DEVICE_PASSWORD="YourPasswordHere"
```

## Step 3 — Make Script Executable
```bash
chmod +x edisplay-kiosk.sh
```

## Step 4 — Set Script to Run on Boot
Edit the autostart file:
```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/edisplay.desktop
```
Paste this content:
```
[Desktop Entry]
Type=Application
Name=E-Display Kiosk
Exec=/home/pi/edisplay-kiosk.sh
X-GNOME-Autostart-enabled=true
```

## Step 5 — Disable Screensaver Permanently
```bash
sudo nano /etc/lightdm/lightdm.conf
```
Add under `[Seat:*]`:
```
xserver-command=X -s 0 dpms
```

## Step 6 — Test
Reboot the Raspberry Pi:
```bash
sudo reboot
```
It should automatically open the browser, go to E-Display, and log in.

## Different Credentials Per Device
Each Raspberry Pi gets its own device account created from the Publisher dashboard.
Just change DEVICE_EMAIL and DEVICE_PASSWORD in the script for each Pi.

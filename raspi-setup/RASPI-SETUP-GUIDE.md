# Raspberry Pi Setup Guide for E-Display

## Step 1 — Install Required Packages
```bash
sudo apt update
sudo apt install -y chromium-browser xdotool unclutter
```

## Step 2 — Copy the Script to Raspberry Pi
Put `edisplay-kiosk.sh` in the home folder:
```bash
cp edisplay-kiosk.sh /home/pi/edisplay-kiosk.sh
```

Edit the credentials for this specific device:
```bash
nano /home/pi/edisplay-kiosk.sh
```
Change these two lines:
```bash
DEVICE_EMAIL="room301@edisplay.com"    # Use the email created in publisher
DEVICE_PASSWORD="YourPasswordHere"     # Use the password created in publisher
```

## Step 3 — Make Script Executable
```bash
chmod +x /home/pi/edisplay-kiosk.sh
```

## Step 4 — Auto-Start on Boot
```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/edisplay.desktop
```
Paste this:
```ini
[Desktop Entry]
Type=Application
Name=E-Display Kiosk
Exec=/home/pi/edisplay-kiosk.sh
X-GNOME-Autostart-enabled=true
```

## Step 5 — Disable Screensaver
```bash
sudo nano /etc/lightdm/lightdm.conf
```
Under `[Seat:*]` add:
```
xserver-command=X -s 0 dpms
```

## Step 6 — Reboot and Test
```bash
sudo reboot
```
The Pi will automatically open the browser and login.

## For Each New Raspberry Pi
1. Create a device account in Publisher dashboard (Device Manager)
2. Copy the script to the new Pi
3. Change DEVICE_EMAIL and DEVICE_PASSWORD
4. Reboot

## Troubleshooting
- If login fails: Check credentials in the script match Publisher dashboard
- If screen goes blank: Re-check lightdm.conf settings
- If browser doesn't open: Check if chromium-browser is installed (`which chromium-browser`)

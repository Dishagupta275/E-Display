# E-Display Backend

This is the Flask backend for the E-Display project.

## Installation

1. Create a Python virtual environment:
   `ash
   python -m venv venv
   `
2. Activate the environment:
   - Windows PowerShell:
     `powershell
     .\venv\Scripts\Activate.ps1
     `
   - Windows CMD:
     `cmd
     .\venv\Scripts\activate.bat
     `
3. Install dependencies:
   `ash
   pip install -r requirements.txt
   `

## Database setup

1. Create a MySQL database named edisplay_db.
2. Update ackend/config.py or set the environment variable for the MySQL URI if you use a custom connection.
3. Run migrations:
   `ash
   python -m flask db upgrade
   `

## Run the server

From the ackend folder:

`ash
python -m flask run
`

If using the default development config, make sure FLASK_ENV=development is set.

## API Endpoints

### Auth
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- POST /api/auth/users
- GET /api/auth/users

### Classes
- GET /api/departments
- POST /api/departments
- GET /api/classes
- POST /api/classes
- PUT /api/classes/<int:class_id>
- DELETE /api/classes/<int:class_id>
- GET /api/classes/<int:class_id>/faculty
- GET /api/subjects/<int:department_id>/<int:year>
- POST /api/subjects
- POST /api/device/heartbeat
- GET /api/devices/status

### Timetable
- GET /api/timetable/<int:class_id>
- POST /api/timetable/<int:class_id>
- POST /api/timetable/<int:class_id>/publish
- GET /api/timetable/<int:class_id>/current-period
- POST /api/period-timings
- GET /api/period-timings

### Notifications
- POST /api/notifications
- GET /api/notifications/<target_type>/<target_id>
- GET /api/notifications/active/<int:class_id>
- DELETE /api/notifications/<int:notification_id>

### Announcements
- POST /api/announcements
- GET /api/announcements
- GET /api/announcements/<int:department_id>
- DELETE /api/announcements/<int:announcement_id>

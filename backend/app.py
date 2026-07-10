import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate, upgrade as run_migrations
from config import config
from models import db, Department, User, PeriodTiming, DeviceStatus, Role, Permission
from routes import register_blueprints
from mqtt_publisher import mqtt_publisher
from datetime import datetime, time


def create_app(config_name='production'):
    """Application factory"""
    app = Flask(__name__)

    # Load configuration
    app.config.from_object(config[config_name])

    # CORS — pulls allowed origins from config.py (single source of truth)
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization", "Access-Control-Allow-Headers"]
        },
        r"/uploads/*": {
            "origins": app.config['CORS_ORIGINS'],
            "methods": ["GET", "OPTIONS"],
        }
    })

    # Initialize extensions
    db.init_app(app)
    JWTManager(app)
    migrate = Migrate(app, db)

    # Register blueprints
    register_blueprints(app)

    # Create uploads folder
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

    # Serve uploaded files
    @app.route('/uploads/<filename>')
    def serve_upload(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # Health check endpoint
    @app.route('/', methods=['GET'])
    def health_check():
        return {'status': 'E-Display Backend Running', 'version': '1.0'}, 200

    # Error handlers
    @app.errorhandler(404)
    def not_found(error):
        return {'message': 'Resource not found'}, 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'message': 'Internal server error'}, 500

    # Create tables, run migrations and seed on every startup
    with app.app_context():
        db.create_all()
        try:
            run_migrations()
            print("✓ Database migrations applied (or already up to date)")
        except Exception as e:
            print(f"⚠ Migration step failed: {e}")
        seed_data()

    # Connect MQTT on startup
    mqtt_publisher.connect()

    return app


# ─────────────────────────────────────────
# PERMISSION CATALOG — the fixed list of gateable actions.
# Add one line here whenever you add a new @require_permission(...) check
# somewhere in the route files. This function is idempotent — safe to run
# on every startup.
# ─────────────────────────────────────────
PERMISSION_CATALOG = [
    ('manage_roles',        'Manage Roles',          'Admin'),
    ('manage_users',         'Manage Users',          'Admin'),
    ('create_department',    'Create Department',     'Departments'),
    ('create_class',         'Create Class',          'Classes'),
    ('delete_class',         'Delete Class',          'Classes'),
    ('manage_subjects',      'Manage Subjects',       'Classes'),
    ('manage_timetable',     'Manage Timetable',      'Timetable'),
    ('post_announcement',    'Post Announcement',     'Announcements'),
    ('manage_noticeboards',  'Manage Notice Boards',  'Notice Board'),
    ('delete_noticeboard',   'Delete Notice Board',   'Notice Board'),
    ('manage_devices',       'Manage Devices',        'Devices'),
    ('delete_device',        'Delete Device',         'Devices'),
    ('send_notification',    'Send Notification',     'Notifications'),
    ('manage_events',        'Manage Events',         'Events'),
    ('delete_event',         'Delete Event',          'Events'),
]

# Starter permission sets for the non-Admin roles created on first boot.
# Admin gets everything automatically (is_system_role bypass in models.py),
# so it isn't listed here.
DEFAULT_ROLE_PERMISSIONS = {
    'HOD': [
        'create_class', 'delete_class', 'manage_subjects', 'manage_timetable',
        'post_announcement', 'manage_noticeboards', 'delete_noticeboard',
        'manage_devices', 'send_notification', 'manage_events', 'delete_event',
    ],
    'Asst HOD': [
        'create_class', 'manage_subjects', 'manage_timetable',
        'post_announcement', 'send_notification', 'manage_events',
    ],
    'Faculty': [
        'post_announcement', 'send_notification',
    ],
}


def seed_permissions():
    """Insert any missing permission rows. Safe to call every startup."""
    created = 0
    for code, label, category in PERMISSION_CATALOG:
        if not Permission.query.filter_by(code=code).first():
            db.session.add(Permission(code=code, label=label, category=category))
            created += 1
    if created:
        db.session.commit()
        print(f"✓ Seeded {created} new permission(s)")


def seed_roles():
    """
    Creates Admin (system role, all permissions via bypass) plus the
    starter HOD / Asst HOD / Faculty roles if they don't already exist.
    Safe to call every startup — never touches roles that already exist,
    so any permission edits Admin makes later in the UI are preserved.
    """
    admin_role = Role.query.filter_by(name='Admin').first()
    if not admin_role:
        admin_role = Role(name='Admin', description='Super-user, full system access', is_system_role=True)
        db.session.add(admin_role)
        db.session.commit()
        print("✓ Created Admin role")

    for role_name, perm_codes in DEFAULT_ROLE_PERMISSIONS.items():
        role = Role.query.filter_by(name=role_name).first()
        if role:
            continue
        role = Role(name=role_name)
        role.permissions = Permission.query.filter(Permission.code.in_(perm_codes)).all()
        db.session.add(role)
        db.session.commit()
        print(f"✓ Created role: {role_name}")

    return admin_role


def seed_data():
    """Seed initial data on first startup. Idempotent — safe on every boot."""
    seed_permissions()
    admin_role = seed_roles()

    # Only create the initial Admin login if there are truly no users yet
    # (keeps this from re-creating an account after you've set up real users).
    if User.query.first() is not None:
        return

    try:
        departments_data = ['CSE', 'ECE', 'MECH', 'DS']
        for dept_name in departments_data:
            db.session.add(Department(name=dept_name))
        db.session.flush()

        admin_user = User(
            name='Admin',
            email='admin@edisplay.com',
            role_id=admin_role.id,
            is_active=True
        )
        admin_user.set_password('Admin@123')
        db.session.add(admin_user)

        timings_data = [
            {'period': 1, 'start': '09:00', 'end': '10:00', 'label': None},
            {'period': 2, 'start': '10:00', 'end': '10:50', 'label': None},
            {'period': 3, 'start': '10:50', 'end': '11:00', 'label': 'Break'},
            {'period': 4, 'start': '11:00', 'end': '11:50', 'label': None},
            {'period': 5, 'start': '11:50', 'end': '12:40', 'label': None},
            {'period': 6, 'start': '12:40', 'end': '13:30', 'label': 'Lunch'},
            {'period': 7, 'start': '13:30', 'end': '14:20', 'label': None},
            {'period': 8, 'start': '14:20', 'end': '15:10', 'label': None},
            {'period': 9, 'start': '15:10', 'end': '16:00', 'label': None},
        ]
        for timing_data in timings_data:
            db.session.add(PeriodTiming(
                period_number=timing_data['period'],
                start_time=datetime.strptime(timing_data['start'], '%H:%M').time(),
                end_time=datetime.strptime(timing_data['end'], '%H:%M').time(),
                label=timing_data.get('label')
            ))

        db.session.commit()
        print("✓ Database seeded with initial data")
        print(f"  - Departments: {', '.join(departments_data)}")
        print("  - Admin account: admin@edisplay.com / Admin@123")
        print("  - Period timings: 9 periods configured")

    except Exception as e:
        db.session.rollback()
        print(f"✗ Error seeding data: {str(e)}")


# Create app instance for Flask CLI and gunicorn
app = create_app(os.environ.get('FLASK_ENV', 'production'))


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
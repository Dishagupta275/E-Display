from flask import Blueprint

auth_bp          = Blueprint('auth', __name__)
classes_bp       = Blueprint('classes', __name__)
timetable_bp     = Blueprint('timetable', __name__)
notifications_bp = Blueprint('notifications', __name__)
announcements_bp = Blueprint('announcements', __name__)
devices_bp       = Blueprint('devices', __name__)

from . import auth, classes, timetable, notifications, announcements, devices  # noqa: F401


def register_blueprints(app):
    app.register_blueprint(auth_bp,          url_prefix="/api/auth")
    app.register_blueprint(classes_bp,       url_prefix="/api")
    app.register_blueprint(timetable_bp,     url_prefix="/api")
    app.register_blueprint(notifications_bp, url_prefix="/api")
    app.register_blueprint(announcements_bp, url_prefix="/api")
    app.register_blueprint(devices_bp,       url_prefix="/api")

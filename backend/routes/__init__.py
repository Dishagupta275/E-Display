from flask import Blueprint

# Create blueprint instances (route modules will import these)
auth_bp = Blueprint('auth', __name__)
classes_bp = Blueprint('classes', __name__)
timetable_bp = Blueprint('timetable', __name__)
notifications_bp = Blueprint('notifications', __name__)
announcements_bp = Blueprint('announcements', __name__)
noticeboards_bp = Blueprint('noticeboards', __name__)
events_bp = Blueprint('events', __name__)   # ← ADD THIS LINE

# Import route modules so they attach their routes to the blueprints above
from . import auth, classes, timetable, notifications, announcements, noticeboards, events  # ← added events


def register_blueprints(app):
    """Register blueprints with explicit URL prefixes"""
    app.register_blueprint(auth_bp,           url_prefix="/api/auth")
    app.register_blueprint(classes_bp,        url_prefix="/api")
    app.register_blueprint(timetable_bp,      url_prefix="/api")
    app.register_blueprint(notifications_bp,  url_prefix="/api")
    app.register_blueprint(announcements_bp,  url_prefix="/api")
    app.register_blueprint(noticeboards_bp,   url_prefix="/api")
    app.register_blueprint(events_bp,         url_prefix="/api")  # ← ADD THIS LINE
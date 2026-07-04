from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()


# ─────────────────────────────────────────
# DEPARTMENT
# ─────────────────────────────────────────
class Department(db.Model):
    __tablename__ = 'departments'

    id         = db.Column(db.Integer, primary_key=True)
    name       = db.Column(db.String(100), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    classes       = db.relationship('Class',        backref='department', lazy=True, cascade='all, delete-orphan')
    subjects      = db.relationship('Subject',      backref='department', lazy=True, cascade='all, delete-orphan')
    announcements = db.relationship('Announcement', backref='department', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':         self.id,
            'name':       self.name,
            'created_at': self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# FACULTY ↔ DEPARTMENT  (many-to-many)
# ─────────────────────────────────────────
faculty_departments = db.Table(
    'faculty_departments',
    db.Column('user_id',       db.Integer, db.ForeignKey('users.id',       ondelete='CASCADE'), primary_key=True),
    db.Column('department_id', db.Integer, db.ForeignKey('departments.id', ondelete='CASCADE'), primary_key=True)
)


# ─────────────────────────────────────────
# USER
# ─────────────────────────────────────────
class User(db.Model):
    __tablename__ = 'users'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    email         = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role          = db.Column(db.String(20), nullable=False)  # principal, hod, asst_hod, faculty
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    is_active     = db.Column(db.Boolean, default=True)
    created_at    = db.Column(db.DateTime, default=datetime.utcnow)

    # Faculty can belong to multiple departments (many-to-many)
    faculty_departments = db.relationship('Department', secondary='faculty_departments', backref='faculty_members')

    # Relationships
    classes_incharge     = db.relationship('Class',        foreign_keys='Class.class_incharge_id',      backref='incharge_faculty',  lazy=True)
    timetable_slots      = db.relationship('TimetableSlot', foreign_keys='TimetableSlot.faculty_id',    backref='faculty',           lazy=True)
    notifications_sent   = db.relationship('Notification',  foreign_keys='Notification.sent_by',        backref='sender',            lazy=True)
    announcements_posted = db.relationship('Announcement',  foreign_keys='Announcement.posted_by',      backref='posted_by_user',    lazy=True)
    events_posted        = db.relationship('Event',         foreign_keys='Event.posted_by',              backref='event_posted_by',   lazy=True)
    tickers_sent         = db.relationship('Ticker',        foreign_keys='Ticker.sent_by',               backref='ticker_sender',     lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id':            self.id,
            'name':          self.name,
            'email':         self.email,
            'role':          self.role,
            'department_id': self.department_id,
            'is_active':     self.is_active,
            'created_at':    self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# CLASS
# ─────────────────────────────────────────
class Class(db.Model):
    __tablename__ = 'classes'

    id                = db.Column(db.Integer, primary_key=True)
    department_id     = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    year              = db.Column(db.Integer, nullable=False)
    section           = db.Column(db.String(1), nullable=False)
    display_name      = db.Column(db.String(50), nullable=False)
    class_incharge_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    room_number       = db.Column(db.String(20), nullable=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    slots  = db.relationship('TimetableSlot', backref='class_ref',   lazy=True, cascade='all, delete-orphan')
    device = db.relationship('DeviceStatus',  backref='class_device', lazy=True, uselist=False, cascade='all, delete-orphan')

    def to_dict(self):
        incharge = User.query.get(self.class_incharge_id) if self.class_incharge_id else None
        return {
            'id':                self.id,
            'department_id':     self.department_id,
            'department_name':   self.department.name if self.department else None,
            'year':              self.year,
            'section':           self.section,
            'display_name':      self.display_name,
            'class_incharge_id': self.class_incharge_id,
            'incharge_name':     incharge.name if incharge else None,
            'room_number':       self.room_number,
            'created_at':        self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# SUBJECT
# ─────────────────────────────────────────
class Subject(db.Model):
    __tablename__ = 'subjects'

    id            = db.Column(db.Integer, primary_key=True)
    name          = db.Column(db.String(100), nullable=False)
    code          = db.Column(db.String(20), nullable=False)
    department_id = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=False)
    year          = db.Column(db.Integer, nullable=False)

    # Relationships
    slots = db.relationship('TimetableSlot', backref='subject_ref', lazy=True)

    def to_dict(self):
        return {
            'id':            self.id,
            'name':          self.name,
            'code':          self.code,
            'department_id': self.department_id,
            'year':          self.year
        }


# ─────────────────────────────────────────
# PERIOD TIMING
# ─────────────────────────────────────────
class PeriodTiming(db.Model):
    __tablename__ = 'period_timings'

    id            = db.Column(db.Integer, primary_key=True)
    period_number = db.Column(db.Integer, nullable=False, unique=True)
    start_time    = db.Column(db.Time, nullable=False)
    end_time      = db.Column(db.Time, nullable=False)
    label         = db.Column(db.String(50), nullable=True)

    # Relationships
    slots = db.relationship('TimetableSlot', backref='timing', lazy=True)

    def to_dict(self):
        return {
            'id':            self.id,
            'period_number': self.period_number,
            'start_time':    self.start_time.strftime('%H:%M') if self.start_time else None,
            'end_time':      self.end_time.strftime('%H:%M')   if self.end_time   else None,
            'label':         self.label
        }


# ─────────────────────────────────────────
# TIMETABLE SLOT
# ─────────────────────────────────────────
class TimetableSlot(db.Model):
    __tablename__ = 'timetable_slots'

    id            = db.Column(db.Integer, primary_key=True)
    class_id      = db.Column(db.Integer, db.ForeignKey('classes.id'),                  nullable=False)
    day           = db.Column(db.String(10), nullable=False)
    period_number = db.Column(db.Integer, db.ForeignKey('period_timings.period_number'), nullable=False)
    slot_type     = db.Column(db.String(20), nullable=False)
    subject_id    = db.Column(db.Integer, db.ForeignKey('subjects.id'),  nullable=True)
    faculty_id    = db.Column(db.Integer, db.ForeignKey('users.id'),     nullable=True)
    room_number   = db.Column(db.String(20), nullable=True)
    updated_at    = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id':            self.id,
            'class_id':      self.class_id,
            'day':           self.day,
            'period_number': self.period_number,
            'slot_type':     self.slot_type,
            'subject_id':    self.subject_id,
            'subject_name':  self.subject_ref.name if self.subject_ref else None,
            'subject_code':  self.subject_ref.code if self.subject_ref else None,
            'faculty_id':    self.faculty_id,
            'faculty_name':  self.faculty.name     if self.faculty     else None,
            'room_number':   self.room_number,
            'start_time':    self.timing.start_time.strftime('%H:%M') if self.timing and self.timing.start_time else None,
            'end_time':      self.timing.end_time.strftime('%H:%M')   if self.timing and self.timing.end_time   else None,
            'updated_at':    self.updated_at.isoformat()
        }


# ─────────────────────────────────────────
# NOTIFICATION  (popup overlay)
# ─────────────────────────────────────────
class Notification(db.Model):
    __tablename__ = 'notifications'

    id                = db.Column(db.Integer, primary_key=True)
    title             = db.Column(db.String(200), nullable=False)
    message           = db.Column(db.Text, nullable=True)
    image_url         = db.Column(db.String(500), nullable=True)
    notification_type = db.Column(db.String(20), nullable=False)   # text, image, event
    target_type       = db.Column(db.String(20), nullable=False)   # all, department, class
    target_id         = db.Column(db.Integer, nullable=True)
    sent_by           = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active         = db.Column(db.Boolean, default=True)
    expires_at        = db.Column(db.DateTime, nullable=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':                self.id,
            'title':             self.title,
            'message':           self.message,
            'image_url':         self.image_url,
            'notification_type': self.notification_type,
            'target_type':       self.target_type,
            'target_id':         self.target_id,
            'sent_by':           self.sent_by,
            'is_active':         self.is_active,
            'expires_at':        self.expires_at.isoformat() if self.expires_at else None,
            'created_at':        self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# ANNOUNCEMENT
# ─────────────────────────────────────────
class Announcement(db.Model):
    __tablename__ = 'announcements'

    id                = db.Column(db.Integer, primary_key=True)
    title             = db.Column(db.String(200), nullable=False)
    content           = db.Column(db.Text, nullable=False)
    announcement_type = db.Column(db.String(20), nullable=False)   # exam, competition, event, general
    image_url         = db.Column(db.String(500), nullable=True)
    department_id     = db.Column(db.Integer, db.ForeignKey('departments.id'), nullable=True)
    posted_by         = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active         = db.Column(db.Boolean, default=True)
    event_date        = db.Column(db.DateTime, nullable=True)
    created_at        = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':                self.id,
            'title':             self.title,
            'content':           self.content,
            'announcement_type': self.announcement_type,
            'image_url':         self.image_url,
            'department_id':     self.department_id,
            'posted_by':         self.posted_by,
            'is_active':         self.is_active,
            'event_date':        self.event_date.isoformat() if self.event_date else None,
            'created_at':        self.created_at.isoformat()
        }

# ─────────────────────────────────────────
# NOTICE BOARD
# ─────────────────────────────────────────
class NoticeBoard(db.Model):
    __tablename__ = 'notice_boards'

    id           = db.Column(db.Integer, primary_key=True)
    name         = db.Column(db.String(200), nullable=False)
    created_by   = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    target_type  = db.Column(db.String(20), nullable=False)  # all, department
    target_id    = db.Column(db.Integer, nullable=True)       # dept_id if department
    display_mode = db.Column(db.String(20), default='carousel')  # carousel, grid
    carousel_time= db.Column(db.Integer, default=10)          # minutes per notice
    is_active    = db.Column(db.Boolean, default=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    notices      = db.relationship('Notice', backref='board', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':            self.id,
            'name':          self.name,
            'created_by':    self.created_by,
            'target_type':   self.target_type,
            'target_id':     self.target_id,
            'display_mode':  self.display_mode,
            'carousel_time': self.carousel_time,
            'is_active':     self.is_active,
            'notice_count':  len(self.notices),
            'created_at':    self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# NOTICE
# ─────────────────────────────────────────
class Notice(db.Model):
    __tablename__ = 'notices'

    id           = db.Column(db.Integer, primary_key=True)
    board_id     = db.Column(db.Integer, db.ForeignKey('notice_boards.id'), nullable=False)
    title        = db.Column(db.String(200), nullable=False)
    content      = db.Column(db.Text, nullable=True)
    image_url    = db.Column(db.String(500), nullable=True)
    order_number = db.Column(db.Integer, default=1)
    is_active    = db.Column(db.Boolean, default=True)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':           self.id,
            'board_id':     self.board_id,
            'title':        self.title,
            'content':      self.content,
            'image_url':    self.image_url,
            'order_number': self.order_number,
            'is_active':    self.is_active,
            'created_at':   self.created_at.isoformat()
        }
# ─────────────────────────────────────────
# EVENT  (display board events section)
# ─────────────────────────────────────────
class Event(db.Model):
    __tablename__ = 'events'

    id             = db.Column(db.Integer, primary_key=True)
    title          = db.Column(db.String(200), nullable=False)
    content        = db.Column(db.Text, nullable=True)
    announcement_type = db.Column(db.String(20), nullable=False, default='general')
    # Values: exam, competition, holiday, meeting, general
    event_date     = db.Column(db.DateTime, nullable=True)
    target_type    = db.Column(db.String(20), nullable=False, default='all')
    # Values: all, department, class
    target_id      = db.Column(db.Integer, nullable=True)
    posted_by      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    is_active      = db.Column(db.Boolean, default=True)
    created_at     = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':                self.id,
            'title':             self.title,
            'content':           self.content,
            'announcement_type': self.announcement_type,
            'event_date':        self.event_date.isoformat() if self.event_date else None,
            'target_type':       self.target_type,
            'target_id':         self.target_id,
            'posted_by':         self.posted_by,
            'is_active':         self.is_active,
            'created_at':        self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# TICKER  (scrolling bottom bar message)
# ─────────────────────────────────────────
class Ticker(db.Model):
    __tablename__ = 'tickers'

    id               = db.Column(db.Integer, primary_key=True)
    message          = db.Column(db.Text, nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=False, default=5)
    target_type      = db.Column(db.String(20), nullable=False, default='all')
    # Values: all, department, class
    target_id        = db.Column(db.Integer, nullable=True)
    sent_by          = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at       = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':               self.id,
            'message':          self.message,
            'duration_minutes': self.duration_minutes,
            'target_type':      self.target_type,
            'target_id':        self.target_id,
            'sent_by':          self.sent_by,
            'created_at':       self.created_at.isoformat()
        }


# ─────────────────────────────────────────
# DEVICE STATUS
# ─────────────────────────────────────────
class DeviceStatus(db.Model):
    __tablename__ = 'device_status'

    id         = db.Column(db.Integer, primary_key=True)
    class_id   = db.Column(db.Integer, db.ForeignKey('classes.id'), unique=True, nullable=False)
    is_online  = db.Column(db.Boolean, default=False)
    last_seen  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    ip_address = db.Column(db.String(50), nullable=True)

    def to_dict(self):
        return {
            'id':         self.id,
            'class_id':   self.class_id,
            'is_online':  self.is_online,
            'last_seen':  self.last_seen.isoformat() if self.last_seen else None,
            'ip_address': self.ip_address
        }


# ─────────────────────────────────────────
# DEVICE  (physical display — persisted via localStorage UUID)
# ─────────────────────────────────────────
class Device(db.Model):
    __tablename__ = 'devices'

    id            = db.Column(db.Integer, primary_key=True)
    device_uid    = db.Column(db.String(64), unique=True, nullable=False)  # generated UUID, persisted on the display
    friendly_name = db.Column(db.String(100), nullable=True)               # e.g. "CSE Block - Room 301"
    class_id      = db.Column(db.Integer, db.ForeignKey('classes.id'), nullable=True)  # NULL = unassigned
    board_id      = db.Column(db.Integer, db.ForeignKey('notice_boards.id'), nullable=True)  # NULL = no board assigned
    device_mode   = db.Column(db.String(20), default='class')  # 'class' or 'board' — which one to actually show
    is_online     = db.Column(db.Boolean, default=False)
    last_seen     = db.Column(db.DateTime, nullable=True)
    ip_address    = db.Column(db.String(50), nullable=True)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)

    class_ref = db.relationship('Class', backref='registered_devices')
    board_ref = db.relationship('NoticeBoard', backref='registered_devices')

    def to_dict(self):
        return {
            'id':            self.id,
            'device_uid':    self.device_uid,
            'friendly_name': self.friendly_name,
            'class_id':      self.class_id,
            'class_name':    self.class_ref.display_name if self.class_ref else None,
            'room_number':   self.class_ref.room_number if self.class_ref else None,
            'board_id':      self.board_id,
            'board_name':    self.board_ref.name if self.board_ref else None,
            'device_mode':   self.device_mode,
            'is_online':     self.is_online,
            'last_seen':     self.last_seen.isoformat() if self.last_seen else None,
            'ip_address':    self.ip_address,
            'registered_at': self.registered_at.isoformat()
        }
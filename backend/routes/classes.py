from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Department, Class, Subject, TimetableSlot, PeriodTiming, DeviceStatus
from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from . import classes_bp


def check_authorization(user_id, required_role=None, department_id=None):
    """Check if user is authorized for the operation"""
    user = User.query.get(user_id)
    if not user:
        return None, 'User not found', 404

    if required_role and user.role not in required_role:
        return None, 'Unauthorized access', 403

    # Both hod and asst_hod are restricted to their own department
    if department_id and user.role in ['hod', 'asst_hod'] and user.department_id != department_id:
        return None, 'Can only access your own department', 403

    return user, None, None


# ─────────────────────────────────────────
# DEPARTMENTS
# ─────────────────────────────────────────

@classes_bp.route('/departments', methods=['GET'])
@jwt_required()
def get_departments():
    """Get all departments"""
    try:
        departments = Department.query.all()
        return jsonify([dept.to_dict() for dept in departments]), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/departments', methods=['POST'])
@jwt_required()
def create_department():
    """Create new department (Principal only)"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = check_authorization(user_id, required_role=['principal'])
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        data = request.get_json()
        if not data.get('name'):
            return jsonify({'message': 'Department name is required'}), 400

        if Department.query.filter_by(name=data['name']).first():
            return jsonify({'message': 'Department already exists'}), 400

        dept = Department(name=data['name'])
        db.session.add(dept)
        db.session.commit()

        return jsonify({
            'message': 'Department created successfully',
            'department': dept.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# CLASSES
# ─────────────────────────────────────────

@classes_bp.route('/classes', methods=['GET'])
@jwt_required()
def get_classes():
    """Get classes grouped by department and year"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user = User.query.get(user_id)

        if not user:
            return jsonify({'message': 'User not found'}), 404

        result = {}

        if user.role == 'principal':
            # Principal sees all departments
            departments = Department.query.all()
        else:
            # HOD, Asst HOD, Faculty see only their department
            departments = Department.query.filter_by(id=user.department_id).all()

        for dept in departments:
            dept_name = dept.name
            result[dept_name] = {}

            classes = Class.query.filter_by(department_id=dept.id).all()

            for cls in classes:
                year_key = str(cls.year)
                if year_key not in result[dept_name]:
                    result[dept_name][year_key] = []

                cls_dict = cls.to_dict()

                # Attach incharge name if available
                if cls.class_incharge_id:
                    incharge = User.query.get(cls.class_incharge_id)
                    cls_dict['incharge_name'] = incharge.name if incharge else None
                else:
                    cls_dict['incharge_name'] = None

                result[dept_name][year_key].append(cls_dict)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/classes/<int:class_id>', methods=['GET'])
@jwt_required()
def get_class(class_id):
    """Get a single class by ID"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        user, error_msg, status_code = check_authorization(
            user_id, department_id=cls.department_id
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        cls_dict = cls.to_dict()

        # Attach incharge name dynamically
        if cls.class_incharge_id:
            incharge = User.query.get(cls.class_incharge_id)
            cls_dict['incharge_name'] = incharge.name if incharge else None
        else:
            cls_dict['incharge_name'] = None

        return jsonify(cls_dict), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/classes', methods=['POST'])
@jwt_required()
def create_class():
    """Create a new class (HOD and Asst HOD only)"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = check_authorization(
            user_id,
            required_role=['hod', 'asst_hod']
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        data = request.get_json()

        if not all(k in data for k in ['year', 'section', 'display_name']):
            return jsonify({'message': 'Missing required fields: year, section, display_name'}), 400

        # HOD/Asst HOD can only create classes in their own department
        department_id = user.department_id

        # Check for duplicate class in same dept/year/section
        existing = Class.query.filter_by(
            department_id=department_id,
            year=data['year'],
            section=data['section']
        ).first()
        if existing:
            return jsonify({'message': 'Class with this year and section already exists'}), 400

        cls = Class(
            department_id=department_id,
            year=data['year'],
            section=data['section'],
            display_name=data['display_name'],
            room_number=data.get('room_number'),
            class_incharge_id=data.get('class_incharge_id')
        )
        db.session.add(cls)
        db.session.commit()

        return jsonify({
            'message': 'Class created successfully',
            'class': cls.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/classes/<int:class_id>', methods=['PUT'])
@jwt_required()
def update_class(class_id):
    """Update a class (HOD and Asst HOD only)"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        user, error_msg, status_code = check_authorization(
            user_id,
            required_role=['hod', 'asst_hod'],
            department_id=cls.department_id
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        data = request.get_json()

        if 'display_name' in data:
            cls.display_name = data['display_name']
        if 'room_number' in data:
            cls.room_number = data['room_number']
        if 'class_incharge_id' in data:
            cls.class_incharge_id = data['class_incharge_id']
        if 'year' in data:
            cls.year = data['year']
        if 'section' in data:
            cls.section = data['section']

        db.session.commit()

        return jsonify({
            'message': 'Class updated successfully',
            'class': cls.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/classes/<int:class_id>', methods=['DELETE'])
@jwt_required()
def delete_class(class_id):
    """Delete a class (HOD only, not Asst HOD)"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        user, error_msg, status_code = check_authorization(
            user_id,
            required_role=['hod'],              # Asst HOD cannot delete
            department_id=cls.department_id
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        db.session.delete(cls)
        db.session.commit()

        return jsonify({'message': 'Class deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# FACULTY FOR A CLASS
# ─────────────────────────────────────────

@classes_bp.route('/classes/<int:class_id>/faculty', methods=['GET'])
@jwt_required()
def get_class_faculty(class_id):
    """Get all faculty in the same department as the class"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        user, error_msg, status_code = check_authorization(
            user_id, department_id=cls.department_id
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        faculty = User.query.filter_by(
            department_id=cls.department_id,
            role='faculty',
            is_active=True
        ).all()

        return jsonify([f.to_dict() for f in faculty]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# SUBJECTS
# ─────────────────────────────────────────

@classes_bp.route('/subjects/<int:dept_id>/<int:year>', methods=['GET'])
@jwt_required()
def get_subjects(dept_id, year):
    """Get subjects for a department and year"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = check_authorization(
            user_id, department_id=dept_id
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        subjects = Subject.query.filter_by(
            department_id=dept_id,
            year=year
        ).all()

        return jsonify([s.to_dict() for s in subjects]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/subjects', methods=['POST'])
@jwt_required()
def create_subject():
    """Create a new subject (HOD and Asst HOD only)"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = check_authorization(
            user_id,
            required_role=['hod', 'asst_hod']
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        data = request.get_json()

        if not all(k in data for k in ['name', 'code', 'year']):
            return jsonify({'message': 'Missing required fields: name, code, year'}), 400

        # Force subject into user's own department
        department_id = user.department_id

        if Subject.query.filter_by(code=data['code'], department_id=department_id).first():
            return jsonify({'message': 'Subject with this code already exists in your department'}), 400

        subject = Subject(
            name=data['name'],
            code=data['code'],
            department_id=department_id,
            year=data['year']
        )
        db.session.add(subject)
        db.session.commit()

        return jsonify({
            'message': 'Subject created successfully',
            'subject': subject.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# DEVICE MONITORING
# ─────────────────────────────────────────

@classes_bp.route('/devices/status', methods=['GET'])
@jwt_required()
def get_device_status():
    """Get online/offline status of all classroom displays"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user = User.query.get(user_id)

        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Consider a device offline if last_seen > 2 minutes ago
        cutoff = datetime.utcnow() - timedelta(minutes=2)

        if user.role == 'principal':
            devices = DeviceStatus.query.all()
        else:
            # Filter to user's department only
            class_ids = [
                cls.id for cls in Class.query.filter_by(
                    department_id=user.department_id
                ).all()
            ]
            devices = DeviceStatus.query.filter(
                DeviceStatus.class_id.in_(class_ids)
            ).all()

        result = []
        for device in devices:
            d = device.to_dict()
            # Mark as offline if last_seen is stale
            if device.last_seen and device.last_seen < cutoff:
                d['is_online'] = False
            cls = Class.query.get(device.class_id)
            d['display_name'] = cls.display_name if cls else 'Unknown'
            result.append(d)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/device/heartbeat', methods=['POST'])
def device_heartbeat():
    """
    Called by Raspberry Pi displays every ~60 seconds to mark themselves online.
    No JWT required — displays don't log in.
    """
    try:
        data = request.get_json()

        if not data or not data.get('class_id'):
            return jsonify({'message': 'class_id is required'}), 400

        device = DeviceStatus.query.filter_by(class_id=data['class_id']).first()

        if device:
            device.is_online = True
            device.last_seen = datetime.utcnow()
            device.ip_address = data.get('ip_address')
        else:
            device = DeviceStatus(
                class_id=data['class_id'],
                is_online=True,
                last_seen=datetime.utcnow(),
                ip_address=data.get('ip_address')
            )
            db.session.add(device)

        db.session.commit()

        return jsonify({'message': 'Heartbeat received'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500
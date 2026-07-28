from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Role, Department, Class, Subject, TimetableSlot, PeriodTiming
from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from decorators import require_permission
from . import classes_bp


def get_current_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return None, 'User not found', 404
    if not user.is_active:
        return None, 'User account is inactive', 403
    return user, None, None


def check_department_scope(user, department_id):
    """
    Users with 'view_all_departments' permission (Admin, Principal, TPO, etc.)
    can access any department. Department-scoped roles (HOD, Asst HOD, Faculty)
    are restricted to their own department_id.
    """
    if user.has_permission('view_all_departments'):
        return True
    if department_id and user.department_id and user.department_id != department_id:
        return False
    return True


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
@require_permission('create_department')
def create_department():
    """Create new department"""
    try:
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
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        result = {}

        if user.has_permission('view_all_departments'):
            # Admin / Principal / college-wide roles see all departments
            departments = Department.query.all()
        else:
            # Department-scoped roles (HOD, Asst HOD, Faculty, etc.) see only their own
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

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        # Device-scoped token (auto-display, no human login)
        if isinstance(jid, str) and jid.startswith('device:'):
            cls_dict = cls.to_dict()
            if cls.class_incharge_id:
                incharge = User.query.get(cls.class_incharge_id)
                cls_dict['incharge_name'] = incharge.name if incharge else None
            else:
                cls_dict['incharge_name'] = None
            return jsonify(cls_dict), 200

        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        if not check_department_scope(user, cls.department_id):
            return jsonify({'message': 'Can only access your own department'}), 403

        cls_dict = cls.to_dict()

        if cls.class_incharge_id:
            incharge = User.query.get(cls.class_incharge_id)
            cls_dict['incharge_name'] = incharge.name if incharge else None
        else:
            cls_dict['incharge_name'] = None

        return jsonify(cls_dict), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/classes', methods=['POST'])
@require_permission('create_class')
def create_class():
    """Create a new class"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        data = request.get_json()

        if not all(k in data for k in ['year', 'section', 'display_name']):
            return jsonify({'message': 'Missing required fields: year, section, display_name'}), 400

        # Department-scoped users create in their own department;
        # college-wide users (Admin, etc.) must specify department_id
        department_id = user.department_id or data.get('department_id')
        if not department_id:
            return jsonify({'message': 'department_id is required'}), 400

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
@require_permission('create_class')
def update_class(class_id):
    """Update a class"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        if not check_department_scope(user, cls.department_id):
            return jsonify({'message': 'Can only access your own department'}), 403

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
@require_permission('delete_class')
def delete_class(class_id):
    """Delete a class"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        if not check_department_scope(user, cls.department_id):
            return jsonify({'message': 'Can only access your own department'}), 403

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
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        cls = Class.query.get(class_id)
        if not cls:
            return jsonify({'message': 'Class not found'}), 404

        if not check_department_scope(user, cls.department_id):
            return jsonify({'message': 'Can only access your own department'}), 403

        faculty = User.query.join(Role).filter(
            Role.name == 'Faculty',
            User.department_id == cls.department_id,
            User.is_active == True
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
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        if not check_department_scope(user, dept_id):
            return jsonify({'message': 'Can only access your own department'}), 403

        subjects = Subject.query.filter_by(department_id=dept_id, year=year).all()

        return jsonify([s.to_dict() for s in subjects]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@classes_bp.route('/subjects', methods=['POST'])
@require_permission('manage_subjects')
def create_subject():
    """Create a new subject"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        data = request.get_json()

        if not all(k in data for k in ['name', 'code', 'year']):
            return jsonify({'message': 'Missing required fields: name, code, year'}), 400

        department_id = user.department_id or data.get('department_id')
        if not department_id:
            return jsonify({'message': 'department_id is required'}), 400

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

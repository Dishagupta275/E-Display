from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User, Department
from . import auth_bp
from datetime import datetime


# ─────────────────────────────────────────
# LOGIN
# ─────────────────────────────────────────

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user — returns JWT token and user info"""
    try:
        data = request.get_json()

        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'message': 'Missing email or password'}), 400

        user = User.query.filter_by(email=data['email']).first()

        if not user or not user.check_password(data['password']):
            return jsonify({'message': 'Invalid email or password'}), 401

        if not user.is_active:
            return jsonify({'message': 'User account is inactive'}), 403

        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# CURRENT USER
# ─────────────────────────────────────────

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current logged in user — always fresh from DB"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user = User.query.get(user_id)

        if not user:
            return jsonify({'message': 'User not found'}), 404

        if not user.is_active:
            return jsonify({'message': 'User account is inactive'}), 403

        return jsonify(user.to_dict()), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# CREATE USER (Principal only)
# ─────────────────────────────────────────

@auth_bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    """
    Create HOD, Asst HOD, or Faculty accounts.
    Only Principal can do this.
    """
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        current_user = User.query.get(user_id)

        if not current_user or current_user.role != 'principal':
            return jsonify({'message': 'Unauthorized. Only principal can create users'}), 403

        data = request.get_json()

        if not all(k in data for k in ['name', 'email', 'password', 'role']):
            return jsonify({'message': 'Missing required fields: name, email, password, role'}), 400

        allowed_roles = ['hod', 'asst_hod', 'faculty']
        if data['role'] not in allowed_roles:
            return jsonify({'message': f'Role must be one of: {", ".join(allowed_roles)}'}), 400

        # HOD and Asst HOD must have a department
        if data['role'] in ['hod', 'asst_hod'] and not data.get('department_id'):
            return jsonify({'message': 'department_id is required for hod and asst_hod'}), 400

        # Validate department exists if provided
        if data.get('department_id'):
            department = Department.query.get(data['department_id'])
            if not department:
                return jsonify({'message': 'Department not found'}), 404

        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email already registered'}), 400

        user = User(
            name=data['name'],
            email=data['email'],
            role=data['role'],
            department_id=data.get('department_id'),
            is_active=True
        )
        user.set_password(data['password'])

        db.session.add(user)
        db.session.commit()

        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# GET ALL USERS (Principal only)
# ─────────────────────────────────────────

@auth_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users — Principal only"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        current_user = User.query.get(user_id)

        if not current_user or current_user.role != 'principal':
            return jsonify({'message': 'Unauthorized. Only principal can view all users'}), 403

        role_filter = request.args.get('role')        # ?role=hod
        dept_filter = request.args.get('department_id')  # ?department_id=2

        query = User.query

        if role_filter:
            query = query.filter_by(role=role_filter)
        if dept_filter:
            query = query.filter_by(department_id=int(dept_filter))

        users = query.all()

        return jsonify([u.to_dict() for u in users]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# UPDATE USER (Principal only)
# ─────────────────────────────────────────

@auth_bp.route('/users/<int:target_id>', methods=['PUT'])
@jwt_required()
def update_user(target_id):
    """Update a user's details — Principal only"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        current_user = User.query.get(user_id)

        if not current_user or current_user.role != 'principal':
            return jsonify({'message': 'Unauthorized. Only principal can update users'}), 403

        user = User.query.get(target_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Prevent editing the principal account itself
        if user.role == 'principal':
            return jsonify({'message': 'Cannot edit the principal account'}), 403

        data = request.get_json()

        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            existing = User.query.filter_by(email=data['email']).first()
            if existing and existing.id != target_id:
                return jsonify({'message': 'Email already in use'}), 400
            user.email = data['email']
        if 'role' in data:
            if data['role'] not in ['hod', 'asst_hod', 'faculty']:
                return jsonify({'message': 'Invalid role'}), 400
            user.role = data['role']
        if 'department_id' in data:
            if data['department_id']:
                dept = Department.query.get(data['department_id'])
                if not dept:
                    return jsonify({'message': 'Department not found'}), 404
            user.department_id = data['department_id']
        if 'is_active' in data:
            user.is_active = data['is_active']
        if 'password' in data and data['password']:
            user.set_password(data['password'])

        db.session.commit()

        return jsonify({
            'message': 'User updated successfully',
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# DEACTIVATE USER (Principal only)
# ─────────────────────────────────────────
@auth_bp.route('/faculty', methods=['GET'])
@jwt_required()
def get_faculty():
    """Get faculty list — accessible by principal, hod, asst_hod"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        current_user = User.query.get(user_id)

        if not current_user or current_user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        # HOD/Asst HOD only see faculty in their own department
        if current_user.role in ['hod', 'asst_hod']:
            faculty = User.query.filter_by(
                role='faculty',
                department_id=current_user.department_id,
                is_active=True
            ).all()
        else:
            # Principal sees all faculty
            faculty = User.query.filter_by(role='faculty', is_active=True).all()

        return jsonify([u.to_dict() for u in faculty]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500
@auth_bp.route('/users/<int:target_id>', methods=['DELETE'])
@jwt_required()
def deactivate_user(target_id):
    """
    Deactivate a user account — Principal only.
    Does not delete from DB, just sets is_active = False.
    """
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        current_user = User.query.get(user_id)

        if not current_user or current_user.role != 'principal':
            return jsonify({'message': 'Unauthorized. Only principal can deactivate users'}), 403

        user = User.query.get(target_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        if user.role == 'principal':
            return jsonify({'message': 'Cannot deactivate the principal account'}), 403

        user.is_active = False
        db.session.commit()

        return jsonify({'message': f'User {user.name} deactivated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500
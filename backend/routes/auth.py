from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import db, User, Department, Role
from decorators import require_permission
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
# CREATE USER (Admin only — was Principal only)
# ─────────────────────────────────────────

@auth_bp.route('/users', methods=['POST'])
@require_permission('manage_users')
def create_user():
    """
    Create a user with any role that exists in the roles table.
    Only users whose role has 'manage_users' permission can do this (Admin by default).
    """
    try:
        data = request.get_json()

        if not all(k in data for k in ['name', 'email', 'password', 'role_id']):
            return jsonify({'message': 'Missing required fields: name, email, password, role_id'}), 400

        role = Role.query.get(data['role_id'])
        if not role:
            return jsonify({'message': 'Invalid role_id'}), 400

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
            role_id=data['role_id'],
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
# GET ALL USERS (Admin only)
# ─────────────────────────────────────────

@auth_bp.route('/users', methods=['GET'])
@require_permission('manage_users')
def get_users():
    """Get all users — requires manage_users permission"""
    try:
        role_filter = request.args.get('role_id')
        dept_filter = request.args.get('department_id')

        query = User.query

        if role_filter:
            query = query.filter_by(role_id=int(role_filter))
        if dept_filter:
            query = query.filter_by(department_id=int(dept_filter))

        users = query.all()

        return jsonify([u.to_dict() for u in users]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# UPDATE USER (Admin only)
# ─────────────────────────────────────────

@auth_bp.route('/users/<int:target_id>', methods=['PUT'])
@require_permission('manage_users')
def update_user(target_id):
    """Update a user's details — requires manage_users permission"""
    try:
        user = User.query.get(target_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        # Prevent editing the Admin system-role account via this endpoint
        if user.role_obj and user.role_obj.is_system_role:
            return jsonify({'message': 'Cannot edit an Admin account here'}), 403

        data = request.get_json()

        if 'name' in data:
            user.name = data['name']
        if 'email' in data:
            existing = User.query.filter_by(email=data['email']).first()
            if existing and existing.id != target_id:
                return jsonify({'message': 'Email already in use'}), 400
            user.email = data['email']
        if 'role_id' in data:
            role = Role.query.get(data['role_id'])
            if not role:
                return jsonify({'message': 'Invalid role_id'}), 400
            user.role_id = data['role_id']
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
# GET FACULTY LIST
# ─────────────────────────────────────────
@auth_bp.route('/faculty', methods=['GET'])
@require_permission('view_faculty')
def get_faculty():
    """Get faculty list — requires view_faculty permission"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        current_user = User.query.get(user_id)

        if current_user.department_id:
            faculty = User.query.join(Role).filter(
                Role.name == 'Faculty',
                User.department_id == current_user.department_id,
                User.is_active == True
            ).all()
        else:
            faculty = User.query.join(Role).filter(Role.name == 'Faculty', User.is_active == True).all()

        return jsonify([u.to_dict() for u in faculty]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# DEACTIVATE USER (Admin only)
# ─────────────────────────────────────────
@auth_bp.route('/users/<int:target_id>', methods=['DELETE'])
@require_permission('manage_users')
def deactivate_user(target_id):
    """
    Deactivate a user account — requires manage_users permission.
    Does not delete from DB, just sets is_active = False.
    """
    try:
        user = User.query.get(target_id)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        if user.role_obj and user.role_obj.is_system_role:
            return jsonify({'message': 'Cannot deactivate an Admin account'}), 403

        user.is_active = False
        db.session.commit()

        return jsonify({'message': f'User {user.name} deactivated successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500
from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Class
from . import devices_bp
from datetime import datetime


# ─────────────────────────────────────────
# GET ALL DEVICES (Principal/HOD only)
# ─────────────────────────────────────────
@devices_bp.route('/devices', methods=['GET'])
@jwt_required()
def get_devices():
    try:
        jid = get_jwt_identity()
        current_user = User.query.get(int(jid))
        if not current_user or current_user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        devices = User.query.filter_by(role='device', is_active=True).all()
        result = []
        for d in devices:
            assigned_class = Class.query.get(d.assigned_class_id) if d.assigned_class_id else None
            result.append({
                **d.to_dict(),
                'assigned_class': assigned_class.to_dict() if assigned_class else None
            })
        return jsonify(result), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500


# ─────────────────────────────────────────
# CREATE DEVICE (Principal only)
# ─────────────────────────────────────────
@devices_bp.route('/devices', methods=['POST'])
@jwt_required()
def create_device():
    try:
        jid = get_jwt_identity()
        current_user = User.query.get(int(jid))
        if not current_user or current_user.role != 'principal':
            return jsonify({'message': 'Only principal can create devices'}), 403

        data = request.get_json()
        if not all(k in data for k in ['name', 'email', 'password']):
            return jsonify({'message': 'name, email, password required'}), 400

        if User.query.filter_by(email=data['email']).first():
            return jsonify({'message': 'Email already exists'}), 400

        device = User(
            name=data['name'],
            email=data['email'],
            role='device',
            is_active=True,
            assigned_class_id=data.get('assigned_class_id')
        )
        device.set_password(data['password'])
        db.session.add(device)
        db.session.commit()

        return jsonify({'message': 'Device created', 'device': device.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


# ─────────────────────────────────────────
# UPDATE DEVICE NAME / ASSIGNED CLASS
# ─────────────────────────────────────────
@devices_bp.route('/devices/<int:device_id>', methods=['PUT'])
@jwt_required()
def update_device(device_id):
    try:
        jid = get_jwt_identity()
        current_user = User.query.get(int(jid))
        if not current_user or current_user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        device = User.query.get(device_id)
        if not device or device.role != 'device':
            return jsonify({'message': 'Device not found'}), 404

        data = request.get_json()
        if 'name' in data:
            device.name = data['name']
        if 'assigned_class_id' in data:
            if data['assigned_class_id']:
                cls = Class.query.get(data['assigned_class_id'])
                if not cls:
                    return jsonify({'message': 'Class not found'}), 404
            device.assigned_class_id = data['assigned_class_id']

        db.session.commit()

        assigned_class = Class.query.get(device.assigned_class_id) if device.assigned_class_id else None
        return jsonify({
            'message': 'Device updated',
            'device': {
                **device.to_dict(),
                'assigned_class': assigned_class.to_dict() if assigned_class else None
            }
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


# ─────────────────────────────────────────
# DELETE DEVICE (Principal only)
# ─────────────────────────────────────────
@devices_bp.route('/devices/<int:device_id>', methods=['DELETE'])
@jwt_required()
def delete_device(device_id):
    try:
        jid = get_jwt_identity()
        current_user = User.query.get(int(jid))
        if not current_user or current_user.role != 'principal':
            return jsonify({'message': 'Only principal can delete devices'}), 403

        device = User.query.get(device_id)
        if not device or device.role != 'device':
            return jsonify({'message': 'Device not found'}), 404

        device.is_active = False
        db.session.commit()
        return jsonify({'message': 'Device deactivated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': str(e)}), 500


# ─────────────────────────────────────────
# GET ASSIGNED CLASS FOR LOGGED-IN DEVICE
# ─────────────────────────────────────────
@devices_bp.route('/devices/my-class', methods=['GET'])
@jwt_required()
def get_my_class():
    """Called by subscriber on login — returns assigned class"""
    try:
        jid = get_jwt_identity()
        device = User.query.get(int(jid))
        if not device or device.role != 'device':
            return jsonify({'message': 'Not a device account'}), 403

        if not device.assigned_class_id:
            return jsonify({'assigned_class': None}), 200

        assigned_class = Class.query.get(device.assigned_class_id)
        return jsonify({
            'assigned_class': assigned_class.to_dict() if assigned_class else None
        }), 200
    except Exception as e:
        return jsonify({'message': str(e)}), 500

from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, create_access_token
from models import db, User, Class, Device
from datetime import datetime, timedelta
from . import devices_bp


# ─────────────────────────────────────────
# IDENTIFY  (called by every display on boot + every heartbeat)
# No JWT required — the physical display has not logged in.
# ─────────────────────────────────────────
@devices_bp.route('/devices/identify', methods=['POST'])
def identify_device():
    """
    Body: { "device_uid": "<uuid generated/stored on the display>" }

    - If device_uid is new -> create it as UNASSIGNED, return registered: false
    - If device_uid exists but has no class_id -> still unassigned
    - If device_uid exists and has a class_id -> return the full class object
      so the display can render it immediately, with NO login / NO manual pick.
    """
    try:
        data = request.get_json() or {}
        device_uid = data.get('device_uid')

        if not device_uid:
            return jsonify({'message': 'device_uid is required'}), 400

        ip_address = data.get('ip_address') or request.remote_addr

        device = Device.query.filter_by(device_uid=device_uid).first()

        if not device:
            device = Device(
                device_uid=device_uid,
                is_online=True,
                last_seen=datetime.utcnow(),
                ip_address=ip_address
            )
            db.session.add(device)
            db.session.commit()
            return jsonify({'registered': False, 'message': 'Device registered as unassigned. Ask admin to assign a class.'}), 200

        # Existing device — refresh heartbeat info
        device.is_online = True
        device.last_seen = datetime.utcnow()
        device.ip_address = ip_address
        db.session.commit()

        if not device.class_id:
            return jsonify({'registered': False, 'message': 'Device is registered but not yet assigned to a class.'}), 200

        cls = Class.query.get(device.class_id)
        if not cls:
            # Class was deleted — fall back to unassigned state
            return jsonify({'registered': False, 'message': 'Assigned class no longer exists.'}), 200

        # Device-scoped token: read-only in practice (display only ever calls
        # GET endpoints), long-lived so the Pi never needs to "log in" again.
        device_token = create_access_token(
            identity=f"device:{device.id}",
            expires_delta=timedelta(days=3650)
        )

        return jsonify({
            'registered': True,
            'device': device.to_dict(),
            'class': cls.to_dict(),
            'access_token': device_token
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# LIST DEVICES  (Publisher → DeviceMonitor page)
# ─────────────────────────────────────────
@devices_bp.route('/devices', methods=['GET'])
@jwt_required()
def list_devices():
    try:
        jid = get_jwt_identity()
        user = User.query.get(int(jid)) if jid is not None else None
        if not user:
            return jsonify({'message': 'User not found'}), 404

        cutoff = datetime.utcnow() - timedelta(minutes=2)

        if user.role == 'principal':
            devices = Device.query.order_by(Device.registered_at.desc()).all()
        else:
            # hod / asst_hod / faculty -> only devices assigned to their dept's classes,
            # plus any still-unassigned devices (so they can claim one for their room).
            class_ids = [c.id for c in Class.query.filter_by(department_id=user.department_id).all()]
            devices = Device.query.filter(
                (Device.class_id.in_(class_ids)) | (Device.class_id.is_(None))
            ).order_by(Device.registered_at.desc()).all()

        result = []
        for d in devices:
            item = d.to_dict()
            if d.last_seen and d.last_seen < cutoff:
                item['is_online'] = False
            result.append(item)

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# ASSIGN DEVICE TO CLASS  (Publisher action)
# ─────────────────────────────────────────
@devices_bp.route('/devices/<int:device_id>/assign', methods=['PUT'])
@jwt_required()
def assign_device(device_id):
    try:
        jid = get_jwt_identity()
        user = User.query.get(int(jid)) if jid is not None else None
        if not user:
            return jsonify({'message': 'User not found'}), 404
        if user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        device = Device.query.get(device_id)
        if not device:
            return jsonify({'message': 'Device not found'}), 404

        data = request.get_json() or {}
        class_id = data.get('class_id')
        friendly_name = data.get('friendly_name')

        if class_id is not None:
            cls = Class.query.get(class_id)
            if not cls:
                return jsonify({'message': 'Class not found'}), 404
            if user.role in ['hod', 'asst_hod'] and cls.department_id != user.department_id:
                return jsonify({'message': 'Can only assign classes in your own department'}), 403
            device.class_id = class_id

        if friendly_name is not None:
            device.friendly_name = friendly_name

        db.session.commit()
        return jsonify(device.to_dict()), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# UNASSIGN / DELETE DEVICE
# ─────────────────────────────────────────
@devices_bp.route('/devices/<int:device_id>/unassign', methods=['PUT'])
@jwt_required()
def unassign_device(device_id):
    try:
        device = Device.query.get(device_id)
        if not device:
            return jsonify({'message': 'Device not found'}), 404
        device.class_id = None
        db.session.commit()
        return jsonify(device.to_dict()), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@devices_bp.route('/devices/<int:device_id>', methods=['DELETE'])
@jwt_required()
def delete_device(device_id):
    try:
        jid = get_jwt_identity()
        user = User.query.get(int(jid)) if jid is not None else None
        if not user or user.role != 'principal':
            return jsonify({'message': 'Only principal can remove devices'}), 403

        device = Device.query.get(device_id)
        if not device:
            return jsonify({'message': 'Device not found'}), 404

        db.session.delete(device)
        db.session.commit()
        return jsonify({'message': 'Device removed'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500

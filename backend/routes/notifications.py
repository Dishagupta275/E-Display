from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Notification, Class, Department
from datetime import datetime, timedelta
import os
import json
from werkzeug.utils import secure_filename
from sqlalchemy import or_, and_
from decorators import require_permission
from . import notifications_bp
from mqtt_publisher import mqtt_publisher


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@notifications_bp.route('/notifications', methods=['POST'])
@require_permission('send_notification')
def create_notification():
    """Create a new notification"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None

        data = request.form.get('data')
        data = json.loads(data) if data else request.get_json()

        required_fields = ['title', 'notification_type', 'target_type']
        if not all(k in data for k in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400

        image_url = None

        if data.get('notification_type') == 'image' and 'file' in request.files:
            file = request.files['file']
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_')
                filename = timestamp + filename
                upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads')
                os.makedirs(upload_folder, exist_ok=True)
                file.save(os.path.join(upload_folder, filename))
                image_url = f'/uploads/{filename}'

        expires_minutes = data.get('expires_minutes', 10)
        expires_at = datetime.utcnow() + timedelta(minutes=int(expires_minutes))

        notification = Notification(
            title=data.get('title'),
            message=data.get('message'),
            image_url=image_url,
            notification_type=data.get('notification_type'),
            target_type=data.get('target_type'),
            target_id=data.get('target_id'),
            sent_by=user_id,
            is_active=True,
            expires_at=expires_at
        )

        db.session.add(notification)
        db.session.commit()

        target_type = data.get('target_type')
        target_id   = data.get('target_id')

        mqtt_publisher.connect()

        if target_type == 'all':
            mqtt_publisher.publish_notification('all', notification.to_dict())

        elif target_type == 'class' and target_id:
            class_obj = Class.query.get(int(target_id))
            if class_obj:
                mqtt_publisher.publish_notification(class_obj.display_name, notification.to_dict())
            else:
                print(f"MQTT: Class {target_id} not found")

        elif target_type == 'department' and target_id:
            dept_classes = Class.query.filter_by(department_id=int(target_id)).all()
            for cls in dept_classes:
                mqtt_publisher.publish_notification(cls.display_name, notification.to_dict())
            mqtt_publisher.publish_notification(f'dept_{target_id}', notification.to_dict())

        return jsonify({
            'message': 'Notification created and published successfully',
            'notification': notification.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@notifications_bp.route('/notifications/<target_type>/<target_id>', methods=['GET'])
def get_notifications(target_type, target_id):
    """Get active notifications for a target"""
    try:
        current_time = datetime.utcnow()

        notifications = Notification.query.filter(
            Notification.target_type == target_type,
            Notification.target_id == target_id,
            Notification.is_active == True,
            or_(
                and_(Notification.expires_at.isnot(None), Notification.expires_at > current_time),
                Notification.expires_at.is_(None)
            )
        ).all()

        return jsonify([n.to_dict() for n in notifications]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@notifications_bp.route('/notifications/active/<int:class_id>', methods=['GET'])
def get_active_notifications(class_id):
    """Get all active notifications for a class"""
    try:
        current_time = datetime.utcnow()

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404

        notifications = Notification.query.filter(
            Notification.is_active == True,
            or_(
                Notification.expires_at.is_(None),
                Notification.expires_at > current_time
            )
        ).filter(
            or_(
                and_(Notification.target_type == 'class', Notification.target_id == class_id),
                and_(Notification.target_type == 'department', Notification.target_id == class_obj.department_id),
                Notification.target_type == 'all'
            )
        ).all()

        return jsonify([n.to_dict() for n in notifications]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@notifications_bp.route('/notifications/<int:notification_id>', methods=['DELETE'])
@require_permission('send_notification')
def delete_notification(notification_id):
    """Delete/deactivate a notification"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user = User.query.get(user_id)

        notification = Notification.query.get(notification_id)
        if not notification:
            return jsonify({'message': 'Notification not found'}), 404

        # Department-scoped users can only delete their own department's notifications
        if user.department_id:
            sender = User.query.get(notification.sent_by)
            if sender and sender.department_id != user.department_id:
                return jsonify({'message': 'Can only delete your own department notifications'}), 403

        notification.is_active = False
        db.session.commit()

        return jsonify({'message': 'Notification deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500
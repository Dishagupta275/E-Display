from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Announcement, Department
from datetime import datetime
import os
import json
from werkzeug.utils import secure_filename
from sqlalchemy import or_
from decorators import require_permission
from . import announcements_bp


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@announcements_bp.route('/announcements', methods=['POST'])
@require_permission('post_announcement')
def create_announcement():
    """Create a new announcement"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None

        data = request.form.get('data')
        data = json.loads(data) if data else request.get_json()

        required_fields = ['title', 'content', 'announcement_type']
        if not all(k in data for k in required_fields):
            return jsonify({'message': 'Missing required fields'}), 400

        image_url = None

        if 'file' in request.files:
            file = request.files['file']
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S_')
                filename = timestamp + filename
                upload_folder = os.path.join(os.path.dirname(__file__), '..', 'uploads')
                os.makedirs(upload_folder, exist_ok=True)
                file.save(os.path.join(upload_folder, filename))
                image_url = f'/uploads/{filename}'

        event_date = None
        if data.get('event_date'):
            try:
                event_date = datetime.fromisoformat(data.get('event_date'))
            except:
                pass

        announcement = Announcement(
            title=data.get('title'),
            content=data.get('content'),
            announcement_type=data.get('announcement_type'),
            image_url=image_url,
            department_id=data.get('department_id'),
            posted_by=user_id,
            is_active=True,
            event_date=event_date
        )

        db.session.add(announcement)
        db.session.commit()

        return jsonify({
            'message': 'Announcement created successfully',
            'announcement': announcement.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@announcements_bp.route('/announcements', methods=['GET'])
@jwt_required()
def get_announcements():
    """Get announcements visible to current user"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user = User.query.get(user_id)

        if not user:
            return jsonify({'message': 'User not found'}), 404

        announcement_type = request.args.get('type')

        query = Announcement.query.filter_by(is_active=True)

        if user.department_id is None:
            # Admin / college-wide roles see everything
            pass
        else:
            # Department-scoped users see their department + college-wide
            query = query.filter(
                or_(
                    Announcement.department_id == user.department_id,
                    Announcement.department_id.is_(None)
                )
            )

        if announcement_type:
            query = query.filter_by(announcement_type=announcement_type)

        announcements = query.all()

        return jsonify([a.to_dict() for a in announcements]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@announcements_bp.route('/announcements/<int:department_id>', methods=['GET'])
def get_announcements_by_department(department_id):
    """Get announcements for a specific department (for display screen)"""
    try:
        announcements = Announcement.query.filter_by(is_active=True).filter(
            or_(
                Announcement.department_id == department_id,
                Announcement.department_id.is_(None)
            )
        ).all()

        return jsonify([a.to_dict() for a in announcements]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@announcements_bp.route('/announcements/<int:announcement_id>', methods=['DELETE'])
@require_permission('post_announcement')
def delete_announcement(announcement_id):
    """Delete/deactivate an announcement"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user = User.query.get(user_id)

        announcement = Announcement.query.get(announcement_id)
        if not announcement:
            return jsonify({'message': 'Announcement not found'}), 404

        # Department-scoped users can only delete their own department's announcements
        if user.department_id and announcement.posted_by_user.department_id != user.department_id:
            return jsonify({'message': 'Can only delete own announcements'}), 403

        announcement.is_active = False
        db.session.commit()

        return jsonify({'message': 'Announcement deleted successfully'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500
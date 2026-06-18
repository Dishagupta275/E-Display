from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, NoticeBoard, Notice, Department
from datetime import datetime
import os
from werkzeug.utils import secure_filename
from . import noticeboards_bp


def get_user(user_id):
    return User.query.get(int(user_id))


@noticeboards_bp.route('/notice-boards', methods=['GET'])
@jwt_required()
def get_notice_boards():
    """Get all notice boards visible to current user"""
    try:
        jid = get_jwt_identity()
        user = get_user(jid)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        if user.role == 'principal':
            boards = NoticeBoard.query.filter_by(is_active=True).all()
        else:
            # HOD sees college-wide + their department boards
            boards = NoticeBoard.query.filter(
                NoticeBoard.is_active == True,
                db.or_(
                    NoticeBoard.target_type == 'all',
                    db.and_(
                        NoticeBoard.target_type == 'department',
                        NoticeBoard.target_id == user.department_id
                    )
                )
            ).all()

        return jsonify([b.to_dict() for b in boards]), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notice-boards', methods=['POST'])
@jwt_required()
def create_notice_board():
    """Create new notice board"""
    try:
        jid = get_jwt_identity()
        user = get_user(jid)
        if not user:
            return jsonify({'message': 'User not found'}), 404

        if user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        if not data.get('name'):
            return jsonify({'message': 'Board name is required'}), 400

        # Principal can create college-wide boards
        # HOD can only create department boards
        if user.role == 'principal':
            target_type = data.get('target_type', 'all')
            target_id = data.get('target_id')
        else:
            target_type = 'department'
            target_id = user.department_id

        board = NoticeBoard(
            name=data['name'],
            created_by=user.id,
            target_type=target_type,
            target_id=target_id,
            display_mode=data.get('display_mode', 'carousel'),
            carousel_time=data.get('carousel_time', 10),
        )
        db.session.add(board)
        db.session.commit()

        return jsonify({
            'message': 'Notice board created successfully',
            'board': board.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notice-boards/<int:board_id>', methods=['PUT'])
@jwt_required()
def update_notice_board(board_id):
    """Update notice board settings"""
    try:
        jid = get_jwt_identity()
        user = get_user(jid)
        board = NoticeBoard.query.get(board_id)
        if not board:
            return jsonify({'message': 'Board not found'}), 404

        if user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        if 'name' in data:
            board.name = data['name']
        if 'display_mode' in data:
            board.display_mode = data['display_mode']
        if 'carousel_time' in data:
            board.carousel_time = data['carousel_time']

        db.session.commit()
        return jsonify({'message': 'Board updated', 'board': board.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notice-boards/<int:board_id>', methods=['DELETE'])
@jwt_required()
def delete_notice_board(board_id):
    """Delete notice board"""
    try:
        jid = get_jwt_identity()
        user = get_user(jid)
        board = NoticeBoard.query.get(board_id)
        if not board:
            return jsonify({'message': 'Board not found'}), 404

        if user.role not in ['principal', 'hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        board.is_active = False
        db.session.commit()
        return jsonify({'message': 'Board deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notice-boards/<int:board_id>/notices', methods=['GET'])
@jwt_required()
def get_notices(board_id):
    """Get all notices in a board"""
    try:
        board = NoticeBoard.query.get(board_id)
        if not board:
            return jsonify({'message': 'Board not found'}), 404

        notices = Notice.query.filter_by(
            board_id=board_id,
            is_active=True
        ).order_by(Notice.order_number).all()

        return jsonify({
            'board': board.to_dict(),
            'notices': [n.to_dict() for n in notices]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notice-boards/<int:board_id>/notices', methods=['POST'])
@jwt_required()
def add_notice(board_id):
    """Add notice to board - supports image upload"""
    try:
        jid = get_jwt_identity()
        user = get_user(jid)
        if not user or user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        board = NoticeBoard.query.get(board_id)
        if not board:
            return jsonify({'message': 'Board not found'}), 404

        # Count existing notices
        existing_count = Notice.query.filter_by(
            board_id=board_id, is_active=True
        ).count()

        image_url = None

        # Handle multipart form (image upload)
        if request.content_type and 'multipart' in request.content_type:
            title = request.form.get('title')
            content = request.form.get('content')

            if 'image' in request.files:
                file = request.files['image']
                if file.filename:
                    filename = secure_filename(
                        f"notice_{board_id}_{datetime.utcnow().timestamp()}_{file.filename}"
                    )
                    upload_path = os.path.join('uploads', filename)
                    file.save(upload_path)
                    image_url = f"/uploads/{filename}"
        else:
            # JSON body
            data = request.get_json()
            title = data.get('title')
            content = data.get('content')

        if not title:
            return jsonify({'message': 'Title is required'}), 400

        notice = Notice(
            board_id=board_id,
            title=title,
            content=content,
            image_url=image_url,
            order_number=existing_count + 1
        )
        db.session.add(notice)
        db.session.commit()

        # Publish updated board via MQTT
        _publish_board(board)

        return jsonify({
            'message': 'Notice added successfully',
            'notice': notice.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notices/<int:notice_id>', methods=['DELETE'])
@jwt_required()
def delete_notice(notice_id):
    """Delete a notice"""
    try:
        jid = get_jwt_identity()
        user = get_user(jid)
        if not user or user.role not in ['principal', 'hod', 'asst_hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        notice = Notice.query.get(notice_id)
        if not notice:
            return jsonify({'message': 'Notice not found'}), 404

        notice.is_active = False
        db.session.commit()

        # Republish board after deletion
        board = NoticeBoard.query.get(notice.board_id)
        if board:
            _publish_board(board)

        return jsonify({'message': 'Notice deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notice-boards/<int:board_id>/publish', methods=['POST'])
@jwt_required()
def publish_board(board_id):
    """Manually publish board to MQTT"""
    try:
        board = NoticeBoard.query.get(board_id)
        if not board:
            return jsonify({'message': 'Board not found'}), 404

        _publish_board(board)
        return jsonify({'message': f'Board published to display'}), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


def _publish_board(board):
    """Internal function to publish board via MQTT"""
    try:
        from mqtt_publisher import mqtt_publisher
        notices = Notice.query.filter_by(
            board_id=board.id, is_active=True
        ).order_by(Notice.order_number).all()

        payload = {
            'board': board.to_dict(),
            'notices': [n.to_dict() for n in notices]
        }

        topic = f"edisplay/noticeboard/{board.id}"
        mqtt_publisher.connect()
        mqtt_publisher.client.publish(topic, str(payload), qos=1, retain=True)
    except Exception as e:
        print(f"MQTT publish error: {e}")


# ── Subscriber endpoint (no auth) ──────────────────
@noticeboards_bp.route('/notice-boards/public/<int:board_id>', methods=['GET'])
def get_public_board(board_id):
    """Get board for display screen - no auth needed"""
    try:
        board = NoticeBoard.query.get(board_id)
        if not board or not board.is_active:
            return jsonify({'message': 'Board not found'}), 404

        notices = Notice.query.filter_by(
            board_id=board_id, is_active=True
        ).order_by(Notice.order_number).all()

        return jsonify({
            'board': board.to_dict(),
            'notices': [n.to_dict() for n in notices]
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@noticeboards_bp.route('/notice-boards/public', methods=['GET'])
def get_public_boards():
    """Get all active boards for display screen"""
    try:
        dept_id = request.args.get('department_id')

        if dept_id:
            boards = NoticeBoard.query.filter(
                NoticeBoard.is_active == True,
                db.or_(
                    NoticeBoard.target_type == 'all',
                    db.and_(
                        NoticeBoard.target_type == 'department',
                        NoticeBoard.target_id == int(dept_id)
                    )
                )
            ).all()
        else:
            boards = NoticeBoard.query.filter_by(
                is_active=True, target_type='all'
            ).all()

        result = []
        for board in boards:
            notices = Notice.query.filter_by(
                board_id=board.id, is_active=True
            ).order_by(Notice.order_number).all()
            result.append({
                'board': board.to_dict(),
                'notices': [n.to_dict() for n in notices]
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500
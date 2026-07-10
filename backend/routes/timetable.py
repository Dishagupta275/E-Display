from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Class, TimetableSlot, PeriodTiming
from datetime import datetime
from decorators import require_permission
from . import timetable_bp
from mqtt_publisher import mqtt_publisher


def get_current_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return None, 'User not found', 404
    if not user.is_active:
        return None, 'User account is inactive', 403
    return user, None, None


def check_department_scope(user, class_id):
    """Department-scoped users (department_id set) restricted to own dept's classes."""
    if not user.department_id:
        return True
    class_obj = Class.query.get(class_id)
    if class_obj and class_obj.department_id != user.department_id:
        return False
    return True


@timetable_bp.route('/timetable/<int:class_id>', methods=['GET'])
@jwt_required()
def get_timetable(class_id):
    """Get full weekly timetable for a class"""
    try:
        jid = get_jwt_identity()

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404

        if isinstance(jid, str) and jid.startswith('device:'):
            pass
        else:
            user_id = int(jid) if jid is not None else None
            user, error_msg, status_code = get_current_user(user_id)
            if error_msg:
                return jsonify({'message': error_msg}), status_code
            if not check_department_scope(user, class_id):
                return jsonify({'message': 'Can only access classes in your department'}), 403

        slots = TimetableSlot.query.filter_by(class_id=class_id).all()

        timetable = {
            'Monday': [], 'Tuesday': [], 'Wednesday': [],
            'Thursday': [], 'Friday': [], 'Saturday': []
        }

        for slot in slots:
            if slot.day in timetable:
                timetable[slot.day].append(slot.to_dict())

        for day in timetable:
            timetable[day].sort(key=lambda x: x['period_number'])

        return jsonify(timetable), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@timetable_bp.route('/timetable/<int:class_id>', methods=['POST'])
@require_permission('manage_timetable')
def upsert_timetable(class_id):
    """Upsert timetable slots"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        if not check_department_scope(user, class_id):
            return jsonify({'message': 'Can only access classes in your department'}), 403

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404

        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({'message': 'Expected array of slots'}), 400

        for slot_data in data:
            slot = TimetableSlot.query.filter_by(
                class_id=class_id,
                day=slot_data.get('day'),
                period_number=slot_data.get('period_number')
            ).first()

            if slot:
                slot.slot_type = slot_data.get('slot_type', slot.slot_type)
                slot.subject_id = slot_data.get('subject_id')
                slot.faculty_id = slot_data.get('faculty_id')
                slot.room_number = slot_data.get('room_number')
                slot.updated_at = datetime.utcnow()
            else:
                slot = TimetableSlot(
                    class_id=class_id,
                    day=slot_data.get('day'),
                    period_number=slot_data.get('period_number'),
                    slot_type=slot_data.get('slot_type', 'free'),
                    subject_id=slot_data.get('subject_id'),
                    faculty_id=slot_data.get('faculty_id'),
                    room_number=slot_data.get('room_number')
                )
                db.session.add(slot)

        db.session.commit()

        return jsonify({
            'message': 'Timetable updated successfully',
            'class_id': class_id
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@timetable_bp.route('/timetable/<int:class_id>/publish', methods=['POST'])
@require_permission('manage_timetable')
def publish_timetable(class_id):
    """Publish timetable to MQTT and save to database"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = get_current_user(user_id)
        if error_msg:
            return jsonify({'message': error_msg}), status_code

        if not check_department_scope(user, class_id):
            return jsonify({'message': 'Can only access classes in your department'}), 403

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404

        slots = TimetableSlot.query.filter_by(class_id=class_id).all()

        timetable = {}
        for slot in slots:
            timetable.setdefault(slot.day, []).append(slot.to_dict())

        for day in timetable:
            timetable[day].sort(key=lambda x: x['period_number'])

        mqtt_publisher.connect()
        mqtt_ok = mqtt_publisher.publish_timetable(class_obj.display_name, timetable)

        return jsonify({
            'message': 'Timetable published successfully' if mqtt_ok else 'Timetable saved, but live update may be delayed (MQTT not connected)',
            'class': class_obj.display_name,
            'topic': f'edisplay/timetable/{class_obj.display_name}',
            'live_update_sent': mqtt_ok
        }), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@timetable_bp.route('/timetable/<int:class_id>/current-period', methods=['GET'])
@jwt_required()
def get_current_period(class_id):
    """Get current active period for a class"""
    try:
        jid = get_jwt_identity()

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404

        if isinstance(jid, str) and jid.startswith('device:'):
            pass
        else:
            user_id = int(jid) if jid is not None else None
            user, error_msg, status_code = get_current_user(user_id)
            if error_msg:
                return jsonify({'message': error_msg}), status_code
            if not check_department_scope(user, class_id):
                return jsonify({'message': 'Can only access classes in your department'}), 403

        current_time = datetime.utcnow().time()
        today_index = datetime.utcnow().weekday()
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        today = days[today_index] if today_index < 6 else 'Saturday'

        timings = PeriodTiming.query.order_by(PeriodTiming.period_number).all()

        current_period = None
        for timing in timings:
            if timing.start_time <= current_time <= timing.end_time:
                slot = TimetableSlot.query.filter_by(
                    class_id=class_id, day=today, period_number=timing.period_number
                ).first()

                current_period = {
                    'period_number': timing.period_number,
                    'label': timing.label,
                    'start_time': timing.start_time.strftime('%H:%M'),
                    'end_time': timing.end_time.strftime('%H:%M'),
                    'is_break': timing.label in ['Break', 'Lunch'] if timing.label else False,
                    'is_lunch': timing.label == 'Lunch' if timing.label else False
                }

                if slot:
                    current_period.update({
                        'subject': slot.subject_ref.name if slot.subject_ref else None,
                        'faculty': slot.faculty.name if slot.faculty else None,
                        'room': slot.room_number
                    })

                break

        if not current_period:
            return jsonify({
                'message': 'No active period at this time',
                'current_time': current_time.strftime('%H:%M'),
                'day': today
            }), 200

        return jsonify(current_period), 200

    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@timetable_bp.route('/period-timings', methods=['POST'])
@require_permission('manage_timetable')
def set_period_timings():
    """Set default period timings"""
    try:
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({'message': 'Expected array of period timings'}), 400

        PeriodTiming.query.delete()

        for timing_data in data:
            timing = PeriodTiming(
                period_number=timing_data.get('period_number'),
                start_time=datetime.strptime(timing_data.get('start_time'), '%H:%M').time(),
                end_time=datetime.strptime(timing_data.get('end_time'), '%H:%M').time(),
                label=timing_data.get('label')
            )
            db.session.add(timing)

        db.session.commit()

        return jsonify({'message': 'Period timings set successfully'}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@timetable_bp.route('/period-timings', methods=['GET'])
def get_period_timings():
    """Get all period timings"""
    try:
        timings = PeriodTiming.query.order_by(PeriodTiming.period_number).all()
        return jsonify([t.to_dict() for t in timings]), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500
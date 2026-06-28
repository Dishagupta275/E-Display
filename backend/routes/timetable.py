from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Class, TimetableSlot, PeriodTiming
from datetime import datetime
from . import timetable_bp
from mqtt_publisher import mqtt_publisher


def check_authorization(user_id, required_role=None, class_id=None):
    """Check if user is authorized for the operation"""
    user = User.query.get(user_id)
    if not user:
        return None, 'User not found', 404
    
    if required_role and user.role not in required_role:
        return None, 'Unauthorized access', 403
    
    # Check if HOD is accessing their own department's class
    if class_id and user.role == 'hod':
        class_obj = Class.query.get(class_id)
        if class_obj and class_obj.department_id != user.department_id:
            return None, 'Can only access classes in your department', 403
    
    return user, None, None


@timetable_bp.route('/timetable/<int:class_id>', methods=['GET'])
@jwt_required()
def get_timetable(class_id):
    """Get full weekly timetable for a class"""
    try:
        jid = get_jwt_identity()

        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404

        # Device-scoped token (auto-display) — skip human authorization,
        # the admin already locked this device to this exact class.
        if isinstance(jid, str) and jid.startswith('device:'):
            pass
        else:
            user_id = int(jid) if jid is not None else None
            user, error_msg, status_code = check_authorization(user_id, class_id=class_id)
            if error_msg:
                return jsonify({'message': error_msg}), status_code
        
        # Get all slots for this class
        slots = TimetableSlot.query.filter_by(class_id=class_id).all()
        
        # Organize by day
        timetable = {
            'Monday': [],
            'Tuesday': [],
            'Wednesday': [],
            'Thursday': [],
            'Friday': [],
            'Saturday': []
        }
        
        for slot in slots:
            day = slot.day
            if day in timetable:
                timetable[day].append(slot.to_dict())
        
        # Sort by period number
        for day in timetable:
            timetable[day].sort(key=lambda x: x['period_number'])
        
        return jsonify(timetable), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@timetable_bp.route('/timetable/<int:class_id>', methods=['POST'])
@jwt_required()
def upsert_timetable(class_id):
    """Upsert timetable slots"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = check_authorization(
            user_id,
            required_role=['principal', 'hod'],
            class_id=class_id
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code
        
        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404
        
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({'message': 'Expected array of slots'}), 400
        
        # Upsert slots
        for slot_data in data:
            # Find existing slot
            slot = TimetableSlot.query.filter_by(
                class_id=class_id,
                day=slot_data.get('day'),
                period_number=slot_data.get('period_number')
            ).first()
            
            if slot:
                # Update existing
                slot.slot_type = slot_data.get('slot_type', slot.slot_type)
                slot.subject_id = slot_data.get('subject_id')
                slot.faculty_id = slot_data.get('faculty_id')
                slot.room_number = slot_data.get('room_number')
                slot.updated_at = datetime.utcnow()
            else:
                # Create new
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
@jwt_required()
def publish_timetable(class_id):
    """Publish timetable to MQTT and save to database"""
    try:
        jid = get_jwt_identity()
        user_id = int(jid) if jid is not None else None
        user, error_msg, status_code = check_authorization(
            user_id,
            required_role=['principal', 'hod'],
            class_id=class_id
        )
        if error_msg:
            return jsonify({'message': error_msg}), status_code
        
        class_obj = Class.query.get(class_id)
        if not class_obj:
            return jsonify({'message': 'Class not found'}), 404
        
        # Get timetable
        slots = TimetableSlot.query.filter_by(class_id=class_id).all()
        
        # Organize by day
        timetable = {}
        for slot in slots:
            day = slot.day
            if day not in timetable:
                timetable[day] = []
            timetable[day].append(slot.to_dict())
        
        # Sort by period number
        for day in timetable:
            timetable[day].sort(key=lambda x: x['period_number'])
        
        # Publish to MQTT
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

        # Device-scoped token (auto-display) — skip human authorization.
        if isinstance(jid, str) and jid.startswith('device:'):
            pass
        else:
            user_id = int(jid) if jid is not None else None
            user, error_msg, status_code = check_authorization(user_id, class_id=class_id)
            if error_msg:
                return jsonify({'message': error_msg}), status_code
        
        # Get current time
        current_time = datetime.utcnow().time()
        
        # Get today (0-6 where 0 is Monday)
        today_index = datetime.utcnow().weekday()
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        today = days[today_index] if today_index < 6 else 'Saturday'
        
        # Get period timings
        timings = PeriodTiming.query.order_by(PeriodTiming.period_number).all()
        
        current_period = None
        for timing in timings:
            if timing.start_time <= current_time <= timing.end_time:
                # Get the slot for this period
                slot = TimetableSlot.query.filter_by(
                    class_id=class_id,
                    day=today,
                    period_number=timing.period_number
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
@jwt_required()
def set_period_timings():
    """Set default period timings (Principal only)"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user or user.role != 'principal':
            return jsonify({'message': 'Unauthorized. Only principal can set period timings'}), 403
        
        data = request.get_json()
        if not isinstance(data, list):
            return jsonify({'message': 'Expected array of period timings'}), 400
        
        # Delete existing timings
        PeriodTiming.query.delete()
        
        # Add new timings
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

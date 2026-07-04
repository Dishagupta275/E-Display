from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Event
from datetime import datetime
from . import events_bp


@events_bp.route('/events', methods=['GET'])
def get_events():
    """Get all active events - no auth needed for subscriber"""
    try:
        events = Event.query.filter_by(is_active=True).order_by(Event.event_date).all()
        return jsonify([e.to_dict() for e in events]), 200
    except Exception as e:
        return jsonify({'message': f'Error: {str(e)}'}), 500


@events_bp.route('/events', methods=['POST'])
@jwt_required()
def create_event():
    """Create a new event (Principal or HOD only)"""
    try:
        jid = get_jwt_identity()
        user = User.query.get(int(jid))
        if not user or user.role not in ['principal', 'hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        data = request.get_json()
        if not data.get('title'):
            return jsonify({'message': 'Title is required'}), 400

        event = Event(
            title=data['title'],
            description=data.get('description'),
            event_date=datetime.fromisoformat(data['event_date']) if data.get('event_date') else None,
            posted_by=user.id,
            is_active=True
        )
        db.session.add(event)
        db.session.commit()
        return jsonify({'message': 'Event created', 'event': event.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


@events_bp.route('/events/<int:event_id>', methods=['DELETE'])
@jwt_required()
def delete_event(event_id):
    """Delete an event"""
    try:
        jid = get_jwt_identity()
        user = User.query.get(int(jid))
        if not user or user.role not in ['principal', 'hod']:
            return jsonify({'message': 'Unauthorized'}), 403

        event = Event.query.get(event_id)
        if not event:
            return jsonify({'message': 'Event not found'}), 404

        event.is_active = False
        db.session.commit()
        return jsonify({'message': 'Event deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500
   
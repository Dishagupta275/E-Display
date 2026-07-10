from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required
from models import User


def require_permission(permission_code):
    """
    Route decorator — checks the logged-in user's role has the given permission.
    Usage:
        @auth_bp.route('/users', methods=['POST'])
        @require_permission('manage_users')
        def create_user():
            ...
    """
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            jid = get_jwt_identity()
            user_id = int(jid) if jid is not None else None
            user = User.query.get(user_id)

            if not user:
                return jsonify({'message': 'User not found'}), 404

            if not user.is_active:
                return jsonify({'message': 'User account is inactive'}), 403

            if not user.has_permission(permission_code):
                return jsonify({'message': f'Unauthorized. Missing permission: {permission_code}'}), 403

            return fn(*args, **kwargs)
        return wrapper
    return decorator
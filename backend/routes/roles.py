from flask import request, jsonify
from models import db, Role, Permission
from decorators import require_permission
from . import roles_bp


# ─────────────────────────────────────────
# LIST ALL ROLES
# ─────────────────────────────────────────
@roles_bp.route('/roles', methods=['GET'])
@require_permission('manage_roles')
def get_roles():
    roles = Role.query.all()
    return jsonify([r.to_dict() for r in roles]), 200


# ─────────────────────────────────────────
# CREATE A NEW ROLE (with permissions)
# ─────────────────────────────────────────
@roles_bp.route('/roles', methods=['POST'])
@require_permission('manage_roles')
def create_role():
    try:
        data = request.get_json()
        name = data.get('name')
        description = data.get('description', '')
        permission_ids = data.get('permission_ids', [])

        if not name:
            return jsonify({'message': 'Role name is required'}), 400

        if Role.query.filter_by(name=name).first():
            return jsonify({'message': 'Role already exists'}), 409

        role = Role(name=name, description=description)

        if permission_ids:
            role.permissions = Permission.query.filter(Permission.id.in_(permission_ids)).all()

        db.session.add(role)
        db.session.commit()

        return jsonify({'message': 'Role created', 'role': role.to_dict()}), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# UPDATE A ROLE (name, description, permissions)
# ─────────────────────────────────────────
@roles_bp.route('/roles/<int:role_id>', methods=['PUT'])
@require_permission('manage_roles')
def update_role(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'message': 'Role not found'}), 404

        if role.is_system_role:
            return jsonify({'message': 'Cannot modify the Admin system role'}), 403

        data = request.get_json()

        if 'name' in data:
            existing = Role.query.filter_by(name=data['name']).first()
            if existing and existing.id != role_id:
                return jsonify({'message': 'Role name already in use'}), 400
            role.name = data['name']

        if 'description' in data:
            role.description = data['description']

        if 'permission_ids' in data:
            role.permissions = Permission.query.filter(Permission.id.in_(data['permission_ids'])).all()

        db.session.commit()
        return jsonify({'message': 'Role updated', 'role': role.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# DELETE A ROLE
# ─────────────────────────────────────────
@roles_bp.route('/roles/<int:role_id>', methods=['DELETE'])
@require_permission('manage_roles')
def delete_role(role_id):
    try:
        role = Role.query.get(role_id)
        if not role:
            return jsonify({'message': 'Role not found'}), 404

        if role.is_system_role:
            return jsonify({'message': 'Cannot delete the Admin system role'}), 403

        if role.users:
            return jsonify({'message': f'Cannot delete role — {len(role.users)} user(s) still assigned to it'}), 400

        db.session.delete(role)
        db.session.commit()
        return jsonify({'message': 'Role deleted'}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'message': f'Error: {str(e)}'}), 500


# ─────────────────────────────────────────
# LIST ALL PERMISSIONS (for the "create role" checklist UI)
# ─────────────────────────────────────────
@roles_bp.route('/permissions', methods=['GET'])
@require_permission('manage_roles')
def get_permissions():
    permissions = Permission.query.all()
    return jsonify([p.to_dict() for p in permissions]), 200
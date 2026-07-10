"""RBAC migration - add role_id to users, drop old role column

Revision ID: a1b2c3d4e5f6
Revises: e4b02ac4c3c0
Create Date: 2026-07-10

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'e4b02ac4c3c0'
branch_labels = None
depends_on = None


def _get_columns(table_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return [c['name'] for c in inspector.get_columns(table_name)]


def _get_tables():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return inspector.get_table_names()


def upgrade():
    tables = _get_tables()
    user_columns = _get_columns('users')

    # ── Step 1: add role_id column if it doesn't exist yet ──
    if 'role_id' not in user_columns:
        op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=True))
        op.create_foreign_key(
            'fk_users_role_id_roles', 'users', 'roles', ['role_id'], ['id']
        )

    # ── Step 2: backfill role_id from the old `role` string column, if it exists ──
    if 'role' in user_columns and 'roles' in tables:
        bind = op.get_bind()

        # Map old string values -> new Role names
        role_name_map = {
            'principal': 'Admin',
            'admin':     'Admin',
            'hod':       'HOD',
            'asst_hod':  'Asst HOD',
            'faculty':   'Faculty',
        }

        for old_value, new_role_name in role_name_map.items():
            bind.execute(sa.text("""
                UPDATE users
                SET role_id = (SELECT id FROM roles WHERE name = :role_name)
                WHERE role = :old_value AND role_id IS NULL
            """), {'role_name': new_role_name, 'old_value': old_value})

    # ── Step 3: drop the old `role` string column, if it's still there ──
    if 'role' in user_columns:
        op.drop_column('users', 'role')


def downgrade():
    user_columns = _get_columns('users')

    if 'role' not in user_columns:
        op.add_column('users', sa.Column('role', sa.String(20), nullable=True))

        bind = op.get_bind()
        bind.execute(sa.text("""
            UPDATE users u
            JOIN roles r ON u.role_id = r.id
            SET u.role = LOWER(REPLACE(r.name, ' ', '_'))
        """))

    if 'role_id' in user_columns:
        op.drop_constraint('fk_users_role_id_roles', 'users', type_='foreignkey')
        op.drop_column('users', 'role_id')
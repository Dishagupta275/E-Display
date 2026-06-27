"""add board assignment to devices

Revision ID: e4b02ac4c3c0
Revises: 9fa28be0fe77
Create Date: 2026-06-27

"""
from alembic import op
import sqlalchemy as sa


revision = 'e4b02ac4c3c0'
down_revision = '9fa28be0fe77'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('devices', sa.Column('board_id', sa.Integer(), nullable=True))
    op.add_column('devices', sa.Column('device_mode', sa.String(length=20), nullable=True, server_default='class'))
    op.create_foreign_key(
        'fk_devices_board_id_notice_boards',
        'devices', 'notice_boards',
        ['board_id'], ['id']
    )


def downgrade():
    op.drop_constraint('fk_devices_board_id_notice_boards', 'devices', type_='foreignkey')
    op.drop_column('devices', 'device_mode')
    op.drop_column('devices', 'board_id')
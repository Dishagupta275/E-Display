"""add devices table

Revision ID: 9fa28be0fe77
Revises: 
Create Date: 2026-06-20

"""
from alembic import op
import sqlalchemy as sa


revision = '9fa28be0fe77'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'devices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('device_uid', sa.String(length=64), nullable=False),
        sa.Column('friendly_name', sa.String(length=100), nullable=True),
        sa.Column('class_id', sa.Integer(), nullable=True),
        sa.Column('is_online', sa.Boolean(), nullable=True),
        sa.Column('last_seen', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=50), nullable=True),
        sa.Column('registered_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['class_id'], ['classes.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('device_uid')
    )


def downgrade():
    op.drop_table('devices')
"""add contacts table

Revision ID: j4k5l6m7n8o9
Revises: i3j4k5l6m7n8
Create Date: 2025-12-16 16:00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'j4k5l6m7n8o9'
down_revision = 'i3j4k5l6m7n8'
branch_labels = None
depends_on = None


def upgrade():
    # Create ContactType enum
    op.execute("""
        CREATE TYPE contacttype AS ENUM (
            'inquiry', 'request', 'complaint', 'claim', 'suggestion'
        )
    """)

    # Create ContactStatus enum
    op.execute("""
        CREATE TYPE contactstatus AS ENUM (
            'pending', 'in_review', 'resolved', 'closed'
        )
    """)

    # Create contacts table
    op.create_table(
        'contacts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('client_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('clients.id', ondelete='SET NULL'), nullable=True),
        sa.Column('school_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('schools.id', ondelete='CASCADE'), nullable=True),
        sa.Column('name', sa.String(150), nullable=False),
        sa.Column('email', sa.String(150), nullable=False),
        sa.Column('phone', sa.String(20), nullable=True),
        sa.Column('contact_type', sa.Enum(name='contacttype', create_type=False), nullable=False),
        sa.Column('subject', sa.String(200), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum(name='contactstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('is_read', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('admin_response', sa.Text(), nullable=True),
        sa.Column('admin_response_date', sa.DateTime(), nullable=True),
        sa.Column('responded_by_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()'))
    )

    # Create indexes
    op.create_index('idx_contacts_status', 'contacts', ['status'])
    op.create_index('idx_contacts_is_read', 'contacts', ['is_read'])
    op.create_index('idx_contacts_created_at', 'contacts', ['created_at'])
    op.create_index('idx_contacts_school_id', 'contacts', ['school_id'])
    op.create_index('idx_contacts_contact_type', 'contacts', ['contact_type'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_contacts_contact_type', table_name='contacts')
    op.drop_index('idx_contacts_school_id', table_name='contacts')
    op.drop_index('idx_contacts_created_at', table_name='contacts')
    op.drop_index('idx_contacts_is_read', table_name='contacts')
    op.drop_index('idx_contacts_status', table_name='contacts')

    # Drop table
    op.drop_table('contacts')

    # Drop enums
    op.execute("DROP TYPE contacttype")
    op.execute("DROP TYPE contactstatus")

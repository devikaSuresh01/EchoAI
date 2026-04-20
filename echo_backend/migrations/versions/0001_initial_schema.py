"""initial schema"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "meetings",
        sa.Column("meeting_id", sa.String(length=64), primary_key=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("high_risk_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("meeting_date", sa.Date(), nullable=True),
        sa.Column("participants", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "items",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("meeting_id", sa.String(length=64), sa.ForeignKey("meetings.meeting_id", ondelete="CASCADE"), nullable=False),
        sa.Column("task", sa.Text(), nullable=False),
        sa.Column("owner", sa.String(length=256), nullable=False, server_default="unknown"),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("due_date", sa.String(length=64), nullable=False, server_default="unspecified"),
        sa.Column("risk_keywords", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("evidence", sa.Text(), nullable=False, server_default=""),
        sa.Column("score", sa.Integer(), nullable=False),
        sa.Column("risk", sa.String(length=16), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("needs_confirmation", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("idx_items_meeting_id", "items", ["meeting_id"])
    op.create_table(
        "device_tokens",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("token", name="uq_device_tokens_token"),
    )


def downgrade():
    op.drop_table("device_tokens")
    op.drop_index("idx_items_meeting_id", table_name="items")
    op.drop_table("items")
    op.drop_table("meetings")

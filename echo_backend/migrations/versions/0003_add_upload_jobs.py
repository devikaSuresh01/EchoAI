"""add upload jobs"""

from alembic import op
import sqlalchemy as sa


revision = "0003_add_upload_jobs"
down_revision = "0002_push_auth_ownership"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "upload_jobs",
        sa.Column("job_id", sa.String(length=36), primary_key=True),
        sa.Column("meeting_id", sa.String(length=64), nullable=False),
        sa.Column("firebase_uid", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("source_type", sa.String(length=16), nullable=False),
        sa.Column("filename", sa.Text(), nullable=True),
        sa.Column("content_type", sa.Text(), nullable=True),
        sa.Column("file_ext", sa.String(length=16), nullable=False),
        sa.Column("file_bytes", sa.LargeBinary(), nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("meeting_date", sa.String(length=32), nullable=True),
        sa.Column("participants", sa.Text(), nullable=True),
        sa.Column("transcript", sa.Text(), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=True),
        sa.Column("language", sa.String(length=32), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("result_payload", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("meeting_id", name="uq_upload_jobs_meeting_id"),
    )
    op.create_index("ix_upload_jobs_firebase_uid", "upload_jobs", ["firebase_uid"])
    op.create_index("ix_upload_jobs_status", "upload_jobs", ["status"])


def downgrade():
    op.drop_index("ix_upload_jobs_status", table_name="upload_jobs")
    op.drop_index("ix_upload_jobs_firebase_uid", table_name="upload_jobs")
    op.drop_table("upload_jobs")

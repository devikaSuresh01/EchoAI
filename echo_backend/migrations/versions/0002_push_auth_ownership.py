"""add push auth ownership"""

from alembic import op
import sqlalchemy as sa


revision = "0002_push_auth_ownership"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("device_tokens") as batch_op:
        batch_op.add_column(
            sa.Column(
                "firebase_uid",
                sa.String(length=128),
                nullable=False,
                server_default="legacy-local-user",
            )
        )
        batch_op.add_column(
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            )
        )
        batch_op.create_index(
            "ix_device_tokens_firebase_uid",
            ["firebase_uid"],
            unique=False,
        )

    with op.batch_alter_table("meetings") as batch_op:
        batch_op.add_column(
            sa.Column(
                "firebase_uid",
                sa.String(length=128),
                nullable=False,
                server_default="legacy-local-user",
            )
        )
        batch_op.create_index(
            "ix_meetings_firebase_uid",
            ["firebase_uid"],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table("meetings") as batch_op:
        batch_op.drop_index("ix_meetings_firebase_uid")
        batch_op.drop_column("firebase_uid")

    with op.batch_alter_table("device_tokens") as batch_op:
        batch_op.drop_index("ix_device_tokens_firebase_uid")
        batch_op.drop_column("updated_at")
        batch_op.drop_column("firebase_uid")

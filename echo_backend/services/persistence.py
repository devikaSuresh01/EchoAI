from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from echo_backend.models import Item, Meeting


def _parse_meeting_date(meeting_date: str | None) -> date | None:
    if not meeting_date:
        return None
    return date.fromisoformat(meeting_date)


def _parse_participants(participants: str | None) -> list[str]:
    if not participants:
        return []
    return [participant.strip() for participant in participants.split(",") if participant.strip()]


async def save_meeting(
    db: AsyncSession,
    meeting_id: str,
    ai_result: dict,
    *,
    title: str | None = None,
    meeting_date: str | None = None,
    participants: str | None = None,
) -> None:
    meeting = Meeting(
        meeting_id=meeting_id,
        summary=ai_result["summary"],
        high_risk_count=ai_result["high_risk_count"],
        title=title.strip() if title else None,
        meeting_date=_parse_meeting_date(meeting_date),
        participants=_parse_participants(participants),
    )
    db.add(meeting)

    for item_data in ai_result["items"]:
        item = Item(
            id=str(item_data["id"]),
            meeting_id=meeting_id,
            task=item_data["task"],
            owner=item_data.get("owner", "unknown"),
            status=item_data["status"],
            due_date=item_data.get("due_date", "unspecified"),
            risk_keywords=item_data.get("risk_keywords", []),
            evidence=item_data.get("evidence", ""),
            score=item_data["score"],
            risk=item_data["risk"],
            reason=item_data.get("reason", ""),
            confidence=item_data["confidence"],
            needs_confirmation=item_data["needs_confirmation"],
        )
        db.add(item)

    await db.commit()

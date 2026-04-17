async def call_ai_service(meeting_id: str, transcript: str) -> dict:
    from echo_backend.services.aimodel_gateway import analyze_transcript as gateway_analyze_transcript

    return await gateway_analyze_transcript(meeting_id, transcript)

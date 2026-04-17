async def transcribe_audio(content: bytes, filename: str | None) -> dict:
    from echo_backend.services.aimodel_gateway import transcribe_audio as gateway_transcribe_audio

    return await gateway_transcribe_audio(content, filename)

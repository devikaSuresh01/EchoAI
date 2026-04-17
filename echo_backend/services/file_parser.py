import os
import tempfile


async def extract_text(content: bytes, ext: str) -> str:
    from aimodel.ai_processing.file_reader import extract_text_from_file

    suffix = f".{ext}"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        temp_file.write(content)
        temp_path = temp_file.name

    try:
        return extract_text_from_file(temp_path)
    finally:
        try:
            os.remove(temp_path)
        except FileNotFoundError:
            pass

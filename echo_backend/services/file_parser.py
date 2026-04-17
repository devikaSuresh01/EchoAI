import io


def _normalize_text(text: str) -> str:
    return "\n".join(line.rstrip() for line in text.splitlines()).strip()


async def extract_text(content: bytes, ext: str) -> str:
    if ext == "txt":
        return content.decode("utf-8", errors="ignore").strip()

    if ext == "docx":
        try:
            from docx import Document
        except ImportError as exc:
            raise RuntimeError("python-docx is not installed") from exc

        document = Document(io.BytesIO(content))
        return _normalize_text("\n".join(p.text for p in document.paragraphs))

    if ext == "pdf":
        try:
            import pdfplumber
        except ImportError as exc:
            raise RuntimeError("pdfplumber is not installed") from exc

        with pdfplumber.open(io.BytesIO(content)) as pdf:
            text = "\n".join((page.extract_text() or "") for page in pdf.pages)
        return _normalize_text(text)

    raise ValueError("unsupported file type")

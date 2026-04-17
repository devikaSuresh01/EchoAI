"""
file_reader.py — Extracts plain text from .txt, .docx, .pdf files.

FIXES APPLIED:
  FIX 6: _read_docx() now extracts text from tables in addition to paragraphs.
         Previously doc.paragraphs only — text inside .docx tables was silently
         dropped. Many meeting notes use tables for action items/owners/dates.

  FIX 6 (pdf): pdfplumber silently returns None for scanned/image-only PDFs.
         Error message now tells user the PDF may be scanned and suggests
         using plain text instead.

  FIX 8: .txt files use chardet for automatic encoding detection.
         Previously errors="replace" silently corrupted special characters
         with "?" marks — breaking evidence quotes extracted by Gemini.
         Strategy: UTF-8 first → chardet detection → latin-1 fallback.
"""

import os

import chardet
import pdfplumber
from docx import Document


def extract_text_from_file(file_path: str) -> str:
    """
    Accepts a file path (.txt, .docx, .pdf) and returns plain text string.

    Raises:
      ValueError   — unsupported file type
      RuntimeError — file is empty or has no extractable text
    """
    ext = os.path.splitext(file_path)[1].lower()

    if ext == ".txt":
        text = _read_txt(file_path)
    elif ext == ".docx":
        text = _read_docx(file_path)
    elif ext == ".pdf":
        text = _read_pdf(file_path)
    else:
        raise ValueError(
            f"Unsupported file type: '{ext}'. Only .txt, .docx, .pdf are allowed."
        )

    text = text.strip()
    if not text:
        if ext == ".pdf":
            raise RuntimeError(
                f"No text could be extracted from '{os.path.basename(file_path)}'. "
                "This is likely a scanned or image-based PDF (no text layer). "
                "Please copy-paste the transcript as plain text instead, "
                "or use a PDF with selectable text."
            )
        raise RuntimeError(
            f"File '{os.path.basename(file_path)}' appears to be empty or has no extractable text."
        )

    return text


def _read_txt(file_path: str) -> str:
    """
    FIX 8: Encoding-safe .txt reading.
    Strategy:
      1. Try UTF-8 first
      2. Detect encoding with chardet if UTF-8 fails
      3. Fall back to latin-1 as final resort (never raises decode errors)
    """
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
    except UnicodeDecodeError:
        pass

    with open(file_path, "rb") as f:
        raw_bytes = f.read()

    detected = chardet.detect(raw_bytes)
    encoding = detected.get("encoding") or "latin-1"
    confidence = detected.get("confidence", 0)

    print(f"[file_reader] UTF-8 failed. chardet detected '{encoding}' "
          f"(confidence: {confidence:.0%}). Using that.")

    try:
        return raw_bytes.decode(encoding)
    except (UnicodeDecodeError, LookupError):
        print(f"[file_reader] Detected encoding '{encoding}' also failed. "
              "Falling back to latin-1.")
        return raw_bytes.decode("latin-1")


def _read_docx(file_path: str) -> str:
    """
    FIX 6: Extracts text from BOTH paragraphs AND tables.
    Previously only doc.paragraphs was read — tables were silently skipped.
    Meeting notes often store action items/owners/dates inside tables.
    """
    doc = Document(file_path)
    parts = []

    # Extract paragraph text
    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text.strip())

    # FIX 6: Extract table cell text
    for table in doc.tables:
        for row in table.rows:
            row_cells = []
            for cell in row.cells:
                cell_text = cell.text.strip()
                if cell_text:
                    row_cells.append(cell_text)
            if row_cells:
                # Join cells in a row with tab separator for readability
                parts.append("\t".join(row_cells))

    return "\n".join(parts)


def _read_pdf(file_path: str) -> str:
    """
    FIX 6: Counts image-only pages and logs a warning.
    """
    pages = []
    image_only_pages = 0

    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text and page_text.strip():
                pages.append(page_text)
            else:
                image_only_pages += 1

    if image_only_pages > 0:
        print(
            f"[file_reader] Warning: {image_only_pages}/{total_pages} PDF pages "
            "had no extractable text (may be image/scanned pages)."
        )

    return "\n".join(pages)

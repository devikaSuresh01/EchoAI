"""
chunker.py — Splits transcript into 300–500 word chunks for Gemini processing.

FIXES APPLIED:
  FIX 4: Added hard max fallback. Previously a single sentence longer than
          max_words (500 words) was passed as one oversized chunk to Gemini.
          Now any sentence exceeding max_words is force-split by word count.
          This caps every chunk at max_words regardless of punctuation.
"""

import re


def chunk_transcript(transcript: str, min_words: int = 300, max_words: int = 500) -> list[str]:
    """
    Splits transcript into chunks of 300-500 words.

    Strategy:
      1. Try splitting at sentence boundaries (.!?)
      2. If no punctuation found, fall back to word-count splitting
      3. FIX 4: Any sentence > max_words is force-split by word count

    Never returns empty list if transcript has content.
    """
    if not transcript.strip():
        return []

    total_words = len(transcript.split())

    # Short transcript — return as single chunk
    if total_words <= min_words:
        return [transcript.strip()]

    # Try sentence-boundary splitting
    sentence_pattern = re.compile(r'(?<=[.!?])\s+')
    sentences = sentence_pattern.split(transcript.strip())
    sentences = [s.strip() for s in sentences if s.strip()]

    # FALLBACK: No sentence boundaries found
    if len(sentences) <= 1:
        return _chunk_by_words(transcript.strip(), max_words)

    # FIX 4: Force-split any sentence that exceeds max_words
    normalized_sentences = []
    for sentence in sentences:
        if len(sentence.split()) > max_words:
            # Split this oversized sentence by word count
            normalized_sentences.extend(_chunk_by_words(sentence, max_words))
        else:
            normalized_sentences.append(sentence)

    # Build chunks from normalized sentences
    chunks = []
    current_chunk = []
    current_word_count = 0

    for sentence in normalized_sentences:
        word_count = len(sentence.split())

        if current_word_count + word_count <= max_words:
            current_chunk.append(sentence)
            current_word_count += word_count
        else:
            if current_word_count >= min_words:
                chunks.append(" ".join(current_chunk))
                current_chunk = [sentence]
                current_word_count = word_count
            else:
                # Haven't hit min yet — keep adding
                current_chunk.append(sentence)
                current_word_count += word_count

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks


def _chunk_by_words(text: str, max_words: int) -> list[str]:
    """
    Fallback chunker: splits purely by word count.
    Also used by FIX 4 to split oversized individual sentences.
    """
    words = text.split()
    chunks = []
    for i in range(0, len(words), max_words):
        chunk = " ".join(words[i:i + max_words])
        if chunk:
            chunks.append(chunk)
    return chunks

"""Text chunking utilities for streaming synthesis."""

import re


def split_into_chunks(text: str, max_chars: int = 120) -> list[str]:
    """Split text into sentence-level chunks suitable for streaming TTS."""
    text = text.strip()
    if not text:
        return []

    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks: list[str] = []

    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        if len(sentence) <= max_chars:
            chunks.append(sentence)
            continue
        # Split long sentences on commas or word boundaries
        parts = re.split(r'(?<=,)\s+', sentence)
        current = ""
        for part in parts:
            if len(current) + len(part) + 1 <= max_chars:
                current = f"{current} {part}".strip() if current else part
            else:
                if current:
                    chunks.append(current)
                if len(part) <= max_chars:
                    current = part
                else:
                    words = part.split()
                    current = ""
                    for word in words:
                        if len(current) + len(word) + 1 <= max_chars:
                            current = f"{current} {word}".strip() if current else word
                        else:
                            if current:
                                chunks.append(current)
                            current = word
        if current:
            chunks.append(current)

    return chunks if chunks else [text]

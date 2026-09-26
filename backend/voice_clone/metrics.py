"""Latency instrumentation for streaming voice synthesis."""

import time
from dataclasses import dataclass, field


@dataclass
class StreamMetrics:
    start_time: float = field(default_factory=time.perf_counter)
    first_chunk_time: float | None = None
    end_time: float | None = None
    total_audio_duration: float = 0.0
    chunk_count: int = 0

    def mark_first_chunk(self) -> None:
        if self.first_chunk_time is None:
            self.first_chunk_time = time.perf_counter()

    def add_audio_duration(self, seconds: float) -> None:
        self.total_audio_duration += seconds
        self.chunk_count += 1

    def mark_done(self) -> None:
        self.end_time = time.perf_counter()

    @property
    def ttfa_ms(self) -> float | None:
        if self.first_chunk_time is None:
            return None
        return (self.first_chunk_time - self.start_time) * 1000

    @property
    def rtf(self) -> float | None:
        if self.end_time is None or self.total_audio_duration <= 0:
            return None
        elapsed = self.end_time - self.start_time
        return elapsed / self.total_audio_duration

    def to_dict(self) -> dict:
        return {
            "ttfa_ms": round(self.ttfa_ms, 1) if self.ttfa_ms is not None else None,
            "rtf": round(self.rtf, 3) if self.rtf is not None else None,
            "total_audio_duration_s": round(self.total_audio_duration, 3),
            "chunk_count": self.chunk_count,
            "total_generation_time_s": round((self.end_time or time.perf_counter()) - self.start_time, 3),
        }

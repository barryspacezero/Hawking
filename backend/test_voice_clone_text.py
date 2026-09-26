from voice_clone.text_utils import split_into_chunks


def test_split_short_text():
    chunks = split_into_chunks("Hello world.")
    assert chunks == ["Hello world."]


def test_split_multiple_sentences():
    text = "First sentence. Second sentence! Third one?"
    chunks = split_into_chunks(text)
    assert len(chunks) == 3


def test_split_long_sentence():
    text = "This is a very long sentence that should be split into multiple chunks because it exceeds the maximum character limit for a single synthesis chunk."
    chunks = split_into_chunks(text, max_chars=50)
    assert len(chunks) > 1
    assert all(len(c) <= 80 for c in chunks)

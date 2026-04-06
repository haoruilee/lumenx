from pathlib import Path

from src.utils.media_refs import MEDIA_REF_LOCAL_PATH, classify_media_ref, resolve_local_media_path


def test_classify_media_ref_accepts_existing_absolute_temp_file(tmp_path: Path):
    temp_file = tmp_path / "frame.png"
    temp_file.write_bytes(b"test")

    assert classify_media_ref(str(temp_file)) == MEDIA_REF_LOCAL_PATH


def test_resolve_local_media_path_returns_existing_absolute_temp_file(tmp_path: Path):
    temp_file = tmp_path / "frame.png"
    temp_file.write_bytes(b"test")

    assert resolve_local_media_path(str(temp_file)) == str(temp_file.resolve())

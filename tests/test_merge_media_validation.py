from src.apps.comic_gen.pipeline import ComicGenPipeline


def test_is_decodable_media_file_returns_false_for_missing_file():
    pipeline = ComicGenPipeline.__new__(ComicGenPipeline)

    assert pipeline._is_decodable_media_file("/usr/bin/ffmpeg", "/tmp/does-not-exist.mp3") is False

from src.apps.comic_gen.models import StoryboardFrame


def test_storyboard_frame_includes_bgm_url_field():
    frame = StoryboardFrame(id="frame-1", scene_id="scene-1")

    assert hasattr(frame, "bgm_url")
    assert frame.bgm_url is None

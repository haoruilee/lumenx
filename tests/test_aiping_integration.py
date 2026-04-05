from src.audio.tts import TTSProcessor
from src.models.aiping import AipingVideoModel


def test_aiping_tts_voice_resolution():
    processor = TTSProcessor(api_key=None)
    resolved = processor._resolve_voice_config("male-qn-qingse")
    assert resolved["provider"] == "aiping"
    assert resolved["model"] == "MiniMax-Speech-2.8-hd"
    assert resolved["model_id"] == "male-qn-qingse"


def test_aiping_video_body_for_jimeng():
    model = AipingVideoModel({})
    body = model._build_body(
        model_name="即梦视频生成 3.0 Pro",
        prompt="test",
        duration=5,
        resolution="720p",
        aspect_ratio="16:9",
        image_value=None,
        mode=None,
    )
    assert body["model"] == "即梦视频生成 3.0 Pro"
    assert body["seconds"] == 5
    assert body["aspect_ratio"] == "16:9"
    assert "resolution" not in body


def test_aiping_video_body_for_kling_omni():
    model = AipingVideoModel({})
    body = model._build_body(
        model_name="Kling-V3-Omni",
        prompt="test",
        duration=5,
        resolution="720p",
        aspect_ratio="1:1",
        image_value=None,
        mode="pro",
    )
    assert body["model"] == "Kling-V3-Omni"
    assert body["seconds"] == 5
    assert body["aspect_ratio"] == "1:1"
    assert body["mode"] == "pro"


def test_aiping_video_body_for_kling_o1():
    model = AipingVideoModel({})
    body = model._build_body(
        model_name="Kling-Video-O1",
        prompt="生成一段视频：<<<image_1>>>",
        duration=7,
        resolution="720p",
        aspect_ratio="1:1",
        image_value="https://example.com/ref.png",
        mode="pro",
    )
    assert body["model"] == "Kling-Video-O1"
    assert body["duration"] == "7"
    assert body["aspect_ratio"] == "1:1"
    assert body["mode"] == "pro"
    assert body["reference_images"] == ["https://example.com/ref.png"]
    assert "seconds" not in body

from src.utils.oss_utils import extract_object_key_from_oss_url, normalize_oss_media_ref, sign_oss_urls_in_data


def test_extract_object_key_from_virtual_hosted_oss_url(monkeypatch):
    monkeypatch.setenv("OSS_BUCKET_NAME", "moe-hz")
    monkeypatch.setenv("OSS_ENDPOINT", "oss-cn-hangzhou.aliyuncs.com")
    monkeypatch.setenv("OSS_BASE_PATH", "lumenx")

    url = (
        "https://moe-hz.oss-cn-hangzhou.aliyuncs.com/"
        "lumenx/storyboard/demo.png?OSSAccessKeyId=test&Expires=1&Signature=abc"
    )

    assert extract_object_key_from_oss_url(url) == "lumenx/storyboard/demo.png"
    assert normalize_oss_media_ref(url) == "lumenx/storyboard/demo.png"


def test_sign_oss_urls_in_data_resigns_stale_signed_urls(monkeypatch):
    monkeypatch.setenv("OSS_BUCKET_NAME", "moe-hz")
    monkeypatch.setenv("OSS_ENDPOINT", "oss-cn-hangzhou.aliyuncs.com")
    monkeypatch.setenv("OSS_BASE_PATH", "lumenx")

    class FakeUploader:
        is_configured = True

        def sign_url_for_display(self, object_key: str) -> str:
            return f"https://fresh.example/{object_key}"

    stale = (
        "https://moe-hz.oss-cn-hangzhou.aliyuncs.com/"
        "lumenx/storyboard/demo.png?OSSAccessKeyId=old&Expires=1&Signature=stale"
    )

    result = sign_oss_urls_in_data({"image_url": stale}, uploader=FakeUploader())

    assert result["image_url"] == "https://fresh.example/lumenx/storyboard/demo.png"

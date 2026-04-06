"""AIPing video generation adapter.

Supports multiple video models exposed behind the AIPing REST API:
- Doubao-Seedance-1.0-*
- 即梦视频生成 3.0 Pro
- Kling-V3-Omni
- Kling-Video-O1
"""

import base64
import logging
import os
import time
from typing import Any, Dict, Optional, Tuple

import requests

from .base import VideoGenModel
from ..utils.api_keys import call_with_api_key_rotation, get_api_keys
from ..utils.endpoints import get_provider_base_url
from ..utils.provider_media import resolve_media_input

logger = logging.getLogger(__name__)

_DEFAULT_BASE_URL = "https://aiping.cn/api/v1"
_DEFAULT_MODEL = "Doubao-Seedance-1.0-Pro-Fast"


class AipingVideoModel(VideoGenModel):
    """AIPing REST adapter for async video generation models."""

    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)
        params = config.get("params", {})
        configured_api_key = (config.get("api_key") or "").strip()
        self.api_keys = (
            [configured_api_key]
            if configured_api_key
            else get_api_keys(
                "AIPING_API_KEY",
                fallback_base_names=("OPENAI_API_KEY", "SEEDANCE_API_KEY"),
            )
        )
        self.model_name = params.get("model_name", _DEFAULT_MODEL)

    def _base_url(self) -> str:
        return (
            os.getenv("AIPING_BASE_URL", "").rstrip("/")
            or get_provider_base_url("AIPING", default=_DEFAULT_BASE_URL)
            or get_provider_base_url("SEEDANCE", default=_DEFAULT_BASE_URL)
        )

    def _auth_headers(self, api_key: str) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    def _encode_local_image(self, path: str) -> str:
        ext = os.path.splitext(path)[1].lower()
        mime = "image/png" if ext == ".png" else "image/jpeg"
        with open(path, "rb") as fh:
            data = base64.b64encode(fh.read()).decode("ascii")
        return f"data:{mime};base64,{data}"

    def _resolve_image(self, img_url: Optional[str], img_path: Optional[str], model_name: str) -> Optional[str]:
        if img_path and os.path.exists(img_path):
            return self._encode_local_image(img_path)

        if not img_url:
            return None

        if img_url.startswith("file://"):
            local = img_url[7:]
            if os.path.exists(local):
                return self._encode_local_image(local)

        try:
            from ..utils.oss_utils import OSSImageUploader
            resolved = resolve_media_input(
                img_url,
                model_name=model_name,
                modality="image",
                backend="vendor",
                uploader=OSSImageUploader(),
            )
            return resolved.value
        except Exception as exc:
            logger.warning("[AIPing] Media resolution failed, using raw url: %s", exc)
            return img_url

    def _extract_video_url(self, result: dict) -> Optional[str]:
        for key in ("video_url", "url"):
            if result.get(key):
                return result[key]
        for container_key in ("video", "output", "data"):
            container = result.get(container_key)
            if isinstance(container, dict):
                if container.get("url"):
                    return container["url"]
                if container.get("video_url"):
                    return container["video_url"]
        return None

    def _build_body(
        self,
        *,
        model_name: str,
        prompt: str,
        duration: int,
        resolution: str,
        aspect_ratio: str,
        image_value: Optional[str],
        mode: Optional[str] = None,
        sound: Optional[str] = None,
    ) -> Dict[str, Any]:
        normalized = (model_name or "").strip().lower()
        body: Dict[str, Any] = {
            "model": model_name,
            "prompt": prompt,
            "seconds": duration,
        }
        if image_value:
            body["image"] = image_value

        if normalized.startswith("doubao-seedance-"):
            body["aspect_ratio"] = aspect_ratio
            body["resolution"] = resolution
            return body

        if normalized == "即梦视频生成 3.0 pro":
            body["aspect_ratio"] = aspect_ratio
            return body

        if normalized == "kling-v3-omni":
            body["aspect_ratio"] = aspect_ratio
            body["mode"] = mode or "pro"
            body["sound"] = sound or "off"
            return body

        if normalized == "kling-video-o1":
            if not image_value:
                raise ValueError("Kling-Video-O1 requires at least one reference image")
            body.pop("image", None)
            body.pop("seconds", None)
            body["duration"] = str(duration)
            body["aspect_ratio"] = aspect_ratio
            body["mode"] = mode or "pro"
            body["sound"] = sound or "off"
            body["reference_images"] = [image_value]
            return body

        # Generic fallback for future AIPing video models.
        body["aspect_ratio"] = aspect_ratio
        if resolution:
            body["resolution"] = resolution
        if mode:
            body["mode"] = mode
        if sound:
            body["sound"] = sound
        return body

    def generate(
        self,
        prompt: str,
        output_path: str,
        img_url: Optional[str] = None,
        img_path: Optional[str] = None,
        **kwargs,
    ) -> Tuple[str, float]:
        model_name = kwargs.get("model") or self.model_name
        duration = int(kwargs.get("duration", 5) or 5)
        resolution = kwargs.get("resolution", "720p")
        aspect_ratio = kwargs.get("aspect_ratio", "16:9")
        mode = kwargs.get("mode")
        sound = kwargs.get("sound")
        start_time = time.time()

        if not self.api_keys:
            raise RuntimeError("AIPING_API_KEY is not configured")

        image_value = self._resolve_image(img_url, img_path, model_name)
        body = self._build_body(
            model_name=model_name,
            prompt=prompt,
            duration=duration,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
            image_value=image_value,
            mode=mode,
            sound=sound,
        )

        submit_url = f"{self._base_url()}/videos"
        def _submit_and_wait(api_key: str) -> Tuple[str, float]:
            logger.info(
                "[AIPing] Submitting video task (model=%s, duration=%ss, aspect_ratio=%s, has_image=%s)",
                model_name,
                duration,
                aspect_ratio,
                bool(image_value),
            )
            resp = requests.post(submit_url, headers=self._auth_headers(api_key), json=body, timeout=30)
            resp.raise_for_status()
            data = resp.json()
            task_id = data.get("id")
            if not task_id:
                raise RuntimeError(f"[AIPing] No task id in submit response: {data}")

            poll_url = f"{self._base_url()}/videos/{task_id}"
            max_wait = int(kwargs.get("max_wait", 900))
            poll_interval = int(kwargs.get("poll_interval", 5))
            elapsed = 0

            while elapsed < max_wait:
                time.sleep(poll_interval)
                elapsed += poll_interval

                poll_resp = requests.get(poll_url, headers=self._auth_headers(api_key), timeout=30)
                poll_resp.raise_for_status()
                result = poll_resp.json()
                status = (result.get("status") or "").lower()
                logger.info("[AIPing] model=%s task=%s status=%s (%ss)", model_name, task_id, status, elapsed)

                if status in {"completed", "succeeded"}:
                    video_url = self._extract_video_url(result)
                    if not video_url:
                        raise RuntimeError(f"[AIPing] Task done but no video URL found: {result}")
                    os.makedirs(os.path.dirname(output_path), exist_ok=True)
                    video_bytes = requests.get(video_url, timeout=300).content
                    with open(output_path, "wb") as fh:
                        fh.write(video_bytes)
                    total = time.time() - start_time
                    logger.info("[AIPing] Downloaded result for %s -> %s", model_name, output_path)
                    return output_path, total

                if status in {"failed", "error", "cancelled"}:
                    error = result.get("error") or result.get("message") or result
                    raise RuntimeError(f"[AIPing] Task failed: {error}")

            raise RuntimeError(f"[AIPing] Timed out after {max_wait}s (task_id={task_id}, model={model_name})")

        return call_with_api_key_rotation(self.api_keys, _submit_and_wait)

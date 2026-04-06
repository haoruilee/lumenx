"""
Text-to-Speech (TTS) module.

Currently supports:
- DashScope CosyVoice
- AIPing MiniMax-Speech-2.8-hd
"""
import os
import logging
from typing import Dict, List, Optional, Tuple

from ..utils import log_exception_with_context
from ..utils.api_keys import call_with_api_key_rotation, get_api_keys

logger = logging.getLogger(__name__)


# Voice registry: key -> {provider, model_id, name, gender, model}
# model_id must match the model version (v2 voices for cosyvoice-v2, v3 for cosyvoice-v3-*)
# Reference: https://help.aliyun.com/zh/model-studio/cosyvoice-voice-list
VOICES = {
    # === cosyvoice-v2 voices ===
    'longxiaochun': {'provider': 'dashscope', 'model_id': 'longxiaochun_v2', 'name': '龙小淳 (知性女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longxiaoxia': {'provider': 'dashscope', 'model_id': 'longxiaoxia_v2', 'name': '龙小夏 (沉稳女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longyue': {'provider': 'dashscope', 'model_id': 'longyue_v2', 'name': '龙悦 (温柔女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longmiao': {'provider': 'dashscope', 'model_id': 'longmiao_v2', 'name': '龙淼 (有声书女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longyuan': {'provider': 'dashscope', 'model_id': 'longyuan_v2', 'name': '龙媛 (治愈女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longhua': {'provider': 'dashscope', 'model_id': 'longhua_v2', 'name': '龙华 (活力甜美女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longwan': {'provider': 'dashscope', 'model_id': 'longwan_v2', 'name': '龙婉 (知性女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longxing': {'provider': 'dashscope', 'model_id': 'longxing_v2', 'name': '龙星 (邻家女孩)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longfeifei': {'provider': 'dashscope', 'model_id': 'longfeifei_v2', 'name': '龙菲菲 (甜美女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longyan': {'provider': 'dashscope', 'model_id': 'longyan_v2', 'name': '龙言 (温柔女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longqiang': {'provider': 'dashscope', 'model_id': 'longqiang_v2', 'name': '龙蔷 (浪漫女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'longxiu': {'provider': 'dashscope', 'model_id': 'longxiu_v2', 'name': '龙修 (博学男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longnan': {'provider': 'dashscope', 'model_id': 'longnan_v2', 'name': '龙楠 (睿智少年)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longcheng': {'provider': 'dashscope', 'model_id': 'longcheng_v2', 'name': '龙诚 (睿智青年)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longze': {'provider': 'dashscope', 'model_id': 'longze_v2', 'name': '龙泽 (阳光男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longzhe': {'provider': 'dashscope', 'model_id': 'longzhe_v2', 'name': '龙哲 (暖心男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longtian': {'provider': 'dashscope', 'model_id': 'longtian_v2', 'name': '龙天 (磁性男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longhan': {'provider': 'dashscope', 'model_id': 'longhan_v2', 'name': '龙翰 (深情男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longhao': {'provider': 'dashscope', 'model_id': 'longhao_v2', 'name': '龙浩 (忧郁男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longshu': {'provider': 'dashscope', 'model_id': 'longshu_v2', 'name': '龙书 (播报男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longshuo': {'provider': 'dashscope', 'model_id': 'longshuo_v2', 'name': '龙朔 (博学男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longfei': {'provider': 'dashscope', 'model_id': 'longfei_v2', 'name': '龙飞 (磁性朗诵男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longxiaocheng': {'provider': 'dashscope', 'model_id': 'longxiaocheng_v2', 'name': '龙小诚 (低音男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longshao': {'provider': 'dashscope', 'model_id': 'longshao_v2', 'name': '龙少 (阳光男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longjielidou': {'provider': 'dashscope', 'model_id': 'longjielidou_v2', 'name': '龙杰力豆 (童声男)', 'gender': 'Male', 'model': 'cosyvoice-v2'},
    'longhuhu': {'provider': 'dashscope', 'model_id': 'longhuhu', 'name': '龙虎虎 (童声女)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'loongstella': {'provider': 'dashscope', 'model_id': 'loongstella_v2', 'name': 'Stella (English Female)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    'loongbella': {'provider': 'dashscope', 'model_id': 'loongbella_v2', 'name': 'Bella (English Female)', 'gender': 'Female', 'model': 'cosyvoice-v2'},
    # === cosyvoice-v3 voices (require cosyvoice-v3-flash or cosyvoice-v3-plus) ===
    'longanyang': {'provider': 'dashscope', 'model_id': 'longanyang', 'name': '龙安阳 (阳光少年)', 'gender': 'Male', 'model': 'cosyvoice-v3-flash'},
    'longanhuan': {'provider': 'dashscope', 'model_id': 'longanhuan', 'name': '龙安欢 (活力女)', 'gender': 'Female', 'model': 'cosyvoice-v3-flash'},
    # === AIPing MiniMax voices ===
    'male-qn-qingse': {'provider': 'aiping', 'model_id': 'male-qn-qingse', 'name': '青涩男声', 'gender': 'Male', 'model': 'MiniMax-Speech-2.8-hd'},
}


class TTSProcessor:
    """Text-to-Speech processor using CosyVoice"""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: str = "cosyvoice-v3-flash",
        voice: str = "longanyang"
    ):
        """
        Initialize TTS processor

        Args:
            api_key: DashScope API key. If None, will read from DASHSCOPE_API_KEY env var
            model: TTS model name (default: cosyvoice-v2)
            voice: Default voice ID (default: longxiaochun_v2)
        """
        self.api_key = api_key or os.getenv('DASHSCOPE_API_KEY')
        self.aiping_api_keys: List[str] = get_api_keys(
            "AIPING_API_KEY",
            fallback_base_names=("OPENAI_API_KEY",),
        )
        self.aiping_base_url = (os.getenv("AIPING_BASE_URL") or "https://aiping.cn/api/v1").rstrip("/")
        if self.api_key:
            import dashscope
            dashscope.api_key = self.api_key
        self.model = model
        self.voice = voice

        logger.info(
            "TTS Processor initialized with model=%s, voice=%s, has_dashscope=%s, has_aiping=%s",
            model,
            voice,
            bool(self.api_key),
            bool(self.aiping_api_keys),
        )

    def synthesize(
        self,
        text: str,
        output_path: str,
        voice: Optional[str] = None,
        speech_rate: float = 1.0,
        pitch_rate: float = 1.0,
        volume: int = 50,
    ) -> Tuple[str, float, str]:
        """
        Synthesize speech from text.

        Args:
            text: Text to synthesize (max 20,000 characters)
            output_path: Path to save audio file
            voice: Voice ID override (must match model version)
            speech_rate: Speech speed multiplier (0.5-2.0, default 1.0)
            pitch_rate: Pitch multiplier (0.5-2.0, default 1.0)
            volume: Volume level (0-100, default 50)

        Returns:
            Tuple[str, float, str]: (output_path, first_package_delay_ms, request_id)
        """
        import time
        start_time = time.time()
        voice = voice or self.voice

        resolved = self._resolve_voice_config(voice)
        resolved_voice_id = resolved["model_id"]
        model = resolved["model"]
        provider = resolved["provider"]

        logger.info(
            "Synthesizing with provider=%s, model=%s, voice=%r, provider_voice=%r (rate=%s, pitch=%s, vol=%s)...",
            provider,
            model,
            voice,
            resolved_voice_id,
            speech_rate,
            pitch_rate,
            volume,
        )
        logger.info(f"Text: {text[:100]}{'...' if len(text) > 100 else ''}")

        # Clamp parameters to valid ranges per DashScope docs
        speech_rate = max(0.5, min(2.0, speech_rate))
        pitch_rate = max(0.5, min(2.0, pitch_rate))
        volume = max(0, min(100, volume))

        if provider == "aiping":
            audio_data, request_id, first_package_delay = self._synthesize_aiping(
                text=text,
                voice_id=resolved_voice_id,
                model=model,
                speech_rate=speech_rate,
                pitch_rate=pitch_rate,
                volume=volume,
            )
        else:
            audio_data, request_id, first_package_delay = self._synthesize_dashscope(
                text=text,
                voice_id=resolved_voice_id,
                model=model,
                speech_rate=speech_rate,
                pitch_rate=pitch_rate,
                volume=volume,
            )

        if audio_data is None:
            raise RuntimeError(
                f"TTS provider returned no audio data (request_id={request_id}, voice={voice}, provider_voice={resolved_voice_id}, model={model})"
            )
        if not isinstance(audio_data, (bytes, bytearray)):
            raise RuntimeError(
                f"TTS provider returned unexpected audio payload type: {type(audio_data).__name__} "
                f"(request_id={request_id}, voice={voice}, provider_voice={resolved_voice_id}, model={model})"
            )

        # Ensure output directory exists and save
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(audio_data)

        duration = time.time() - start_time
        logger.info(f"Audio synthesized: request_id={request_id}, delay={first_package_delay}ms, total={duration:.2f}s -> {output_path}")

        return output_path, first_package_delay, request_id

    def _resolve_voice_config(self, voice_id: str) -> Dict[str, str]:
        """Resolve provider-facing voice metadata for a voice.

        v2 voices require cosyvoice-v2, v3 voices require cosyvoice-v3-flash/plus.
        Supports both registry keys (e.g. ``longze``) and raw provider ids
        (e.g. ``longze_v2``). Falls back to the incoming voice id with self.model
        for unknown/custom voices.
        """
        voice_key = (voice_id or "").strip()
        if not voice_key:
            return {"provider": "dashscope", "model_id": self.voice, "model": self.model}

        meta: Optional[Dict[str, str]] = VOICES.get(voice_key)
        if meta:
            return {
                "provider": meta.get("provider", "dashscope"),
                "model_id": meta.get("model_id", voice_key),
                "model": meta.get("model", self.model),
            }

        for registry_key, item in VOICES.items():
            if item.get("model_id") == voice_key:
                return {
                    "provider": item.get("provider", "dashscope"),
                    "model_id": item.get("model_id", registry_key),
                    "model": item.get("model", self.model),
                }

        return {"provider": "dashscope", "model_id": voice_key, "model": self.model}

    def _synthesize_dashscope(
        self,
        *,
        text: str,
        voice_id: str,
        model: str,
        speech_rate: float,
        pitch_rate: float,
        volume: int,
    ) -> Tuple[object, Optional[str], Optional[float]]:
        from dashscope.audio.tts_v2 import SpeechSynthesizer

        synthesizer = SpeechSynthesizer(
            model=model,
            voice=voice_id,
            speech_rate=speech_rate,
            pitch_rate=pitch_rate,
            volume=volume,
        )
        return (
            synthesizer.call(text),
            synthesizer.get_last_request_id(),
            synthesizer.get_first_package_delay(),
        )

    def _synthesize_aiping(
        self,
        *,
        text: str,
        voice_id: str,
        model: str,
        speech_rate: float,
        pitch_rate: float,
        volume: int,
    ) -> Tuple[object, Optional[str], Optional[float]]:
        import requests

        if not self.aiping_api_keys:
            raise RuntimeError("AIPING_API_KEY is not configured")

        def _synthesize(api_key: str) -> Tuple[object, Optional[str], Optional[float]]:
            payload = {
                "model": model,
                "text": text,
                "stream": False,
                "voice_setting": {
                    "voice_id": voice_id,
                    "speed": speech_rate,
                    "vol": max(0, min(10, round(volume / 50, 2))),
                    "pitch": max(-12, min(12, round((pitch_rate - 1.0) * 12, 2))),
                },
            }
            response = requests.post(
                f"{self.aiping_base_url}/audio/speech",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=120,
            )
            response.raise_for_status()
            request_id = response.headers.get("x-request-id")
            content_type = (response.headers.get("content-type") or "").lower()
            if "application/json" in content_type:
                data = response.json()
                audio_payload = data.get("audio")
                if not isinstance(audio_payload, str):
                    nested = data.get("data")
                    if isinstance(nested, dict):
                        audio_payload = nested.get("audio")
                if isinstance(audio_payload, str) and audio_payload:
                    import base64
                    try:
                        return bytes.fromhex(audio_payload), request_id or data.get("trace_id") or data.get("id"), None
                    except ValueError:
                        return base64.b64decode(audio_payload), request_id or data.get("trace_id") or data.get("id"), None
                raise RuntimeError(f"AIPing TTS returned JSON without audio payload: {data}")
            return response.content, request_id, None

        return call_with_api_key_rotation(self.aiping_api_keys, _synthesize)

    @staticmethod
    def list_voices():
        """List available voices with metadata"""
        return VOICES

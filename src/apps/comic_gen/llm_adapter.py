"""
LLM Adapter - Unified interface for DashScope and OpenAI-compatible APIs.

Supports two providers:
  - dashscope (default): Alibaba Cloud DashScope via OpenAI-compatible endpoint
  - openai: Any OpenAI-compatible API (OpenAI, DeepSeek, Ollama, etc.)

Configuration via environment variables:
  LLM_PROVIDER=dashscope|openai
  DASHSCOPE_API_KEY=...
  OPENAI_API_KEY=...
  OPENAI_BASE_URL=https://api.openai.com/v1
  OPENAI_MODEL=gpt-4o
"""
import os
import logging
from typing import Dict, List, Optional, Any
import requests

from ...utils import log_exception_with_context
from ...utils.api_keys import call_with_api_key_rotation, get_api_keys
from ...utils.endpoints import get_provider_base_url

logger = logging.getLogger(__name__)


class LLMAdapter:
    """Unified LLM call interface supporting DashScope and OpenAI-compatible APIs."""

    def __init__(self):
        self.provider = os.getenv("LLM_PROVIDER", "dashscope").lower()
        self._clients: Dict[str, Any] = {}
        logger.info(f"LLM Adapter initialized with provider: {self.provider}")

    @property
    def is_configured(self) -> bool:
        if self.provider == "openai":
            return bool(get_api_keys("OPENAI_API_KEY"))
        return bool(os.getenv("DASHSCOPE_API_KEY"))

    def _get_client(self, api_key: str):
        """Get or create the OpenAI-compatible client (lazy, cached)."""
        if api_key not in self._clients:
            try:
                from openai import OpenAI
            except ImportError:
                raise RuntimeError(
                    "openai package not installed. Run: pip install openai>=1.0.0"
                )

            if self.provider == "openai":
                self._clients[api_key] = OpenAI(
                    api_key=api_key,
                    base_url=os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1"),
                )
            else:
                # DashScope uses OpenAI-compatible endpoint
                self._clients[api_key] = OpenAI(
                    api_key=api_key,
                    base_url=f"{get_provider_base_url('DASHSCOPE')}/compatible-mode/v1",
                )
        return self._clients[api_key]

    def _chat_via_dashscope_http(
        self,
        messages: List[Dict[str, str]],
        model: str,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        api_key = os.getenv("DASHSCOPE_API_KEY")
        if not api_key:
            raise RuntimeError("DashScope API key not configured")

        payload: Dict[str, Any] = {
            "model": model,
            "messages": messages,
        }
        if response_format:
            payload["response_format"] = response_format

        logger.info(
            "Calling DashScope chat completion | model=%r message_count=%r response_format=%r",
            model,
            len(messages),
            response_format,
        )

        url = f"{get_provider_base_url('DASHSCOPE')}/compatible-mode/v1/chat/completions"
        try:
            response = requests.post(
                url,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=120,
            )
        except Exception as exc:
            log_exception_with_context(
                logger,
                "DashScope request failed",
                provider=self.provider,
                model=model,
                url=url,
                message_count=len(messages),
                response_format=response_format,
                error=str(exc),
            )
            raise
        if response.status_code >= 400:
            raise RuntimeError(
                f"DashScope API error (HTTP {response.status_code}): {response.text}"
            )

        data = response.json()
        try:
            return data["choices"][0]["message"]["content"]
        except Exception as exc:
            raise RuntimeError(f"Unexpected DashScope response: {data}") from exc

    def _get_default_model(self) -> str:
        if self.provider == "openai":
            return os.getenv("OPENAI_MODEL", "gpt-4o")
        return os.getenv("LLM_MODEL", "qwen3.5-plus")

    def chat(
        self,
        messages: List[Dict[str, str]],
        model: Optional[str] = None,
        response_format: Optional[Dict[str, str]] = None,
    ) -> str:
        """
        Send a chat completion request and return the response content.

        Args:
            messages: List of {"role": ..., "content": ...} dicts
            model: Model name override (uses provider default if None)
            response_format: Optional {"type": "json_object"} constraint

        Returns:
            The assistant's response content as a string.

        Raises:
            RuntimeError: If the API call fails.
        """
        model = model or self._get_default_model()

        if self.provider == "dashscope":
            return self._chat_via_dashscope_http(
                messages=messages,
                model=model,
                response_format=response_format,
            )

        kwargs: Dict[str, Any] = {
            "model": model,
            "messages": messages,
        }
        if response_format:
            kwargs["response_format"] = response_format

        try:
            api_keys = get_api_keys("OPENAI_API_KEY")
            if not api_keys:
                raise RuntimeError("OpenAI API key not configured")

            def _call(api_key: str) -> str:
                client = self._get_client(api_key)
                response = client.chat.completions.create(**kwargs)
                return response.choices[0].message.content

            return call_with_api_key_rotation(api_keys, _call)
        except Exception as e:
            log_exception_with_context(
                logger,
                "LLM chat completion failed",
                provider=self.provider,
                model=model,
                response_format=response_format,
                message_count=len(messages),
                openai_key_count=len(get_api_keys("OPENAI_API_KEY")) if self.provider == "openai" else None,
                error=str(e),
            )
            provider_label = "DashScope" if self.provider != "openai" else "OpenAI"
            raise RuntimeError(f"{provider_label} API error: {e}") from e

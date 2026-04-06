import os
import re
from typing import Callable, Iterable, List, Mapping, Optional, Sequence, TypeVar

import requests


T = TypeVar("T")


def _iter_matching_env_items(
    base_name: str,
    env: Optional[Mapping[str, str]] = None,
) -> List[tuple[int, str, str]]:
    env_mapping = env if env is not None else os.environ
    pattern = re.compile(rf"^{re.escape(base_name)}(?:_(\d+))?$", re.IGNORECASE)
    matches: List[tuple[int, str, str]] = []

    for key, raw_value in env_mapping.items():
        match = pattern.match(key)
        if not match:
            continue

        value = (raw_value or "").strip()
        if not value:
            continue

        suffix = match.group(1)
        order = 1 if suffix is None else int(suffix)
        matches.append((order, key, value))

    matches.sort(key=lambda item: (item[0], item[1].lower()))
    return matches


def get_api_keys(
    primary_base_name: str,
    *,
    fallback_base_names: Sequence[str] = (),
    env: Optional[Mapping[str, str]] = None,
) -> List[str]:
    values: List[str] = []
    seen = set()

    for base_name in (primary_base_name, *fallback_base_names):
        for _, _, value in _iter_matching_env_items(base_name, env=env):
            if value in seen:
                continue
            seen.add(value)
            values.append(value)

    return values


def get_matching_env_keys(
    base_name: str,
    *,
    env: Optional[Mapping[str, str]] = None,
) -> List[str]:
    return [key for _, key, _ in _iter_matching_env_items(base_name, env=env)]


def get_matching_env_keys_for_bases(
    base_names: Iterable[str],
    *,
    env: Optional[Mapping[str, str]] = None,
) -> List[str]:
    keys: List[str] = []
    seen = set()
    for base_name in base_names:
        for key in get_matching_env_keys(base_name, env=env):
            normalized = key.upper()
            if normalized in seen:
                continue
            seen.add(normalized)
            keys.append(key)
    return keys


def is_retryable_api_error(exc: Exception) -> bool:
    if isinstance(exc, (requests.Timeout, requests.ConnectionError)):
        return True

    response = getattr(exc, "response", None)
    status_code = getattr(exc, "status_code", None)
    if status_code is None and response is not None:
        status_code = getattr(response, "status_code", None)

    if isinstance(status_code, int):
        return status_code in {401, 402, 403, 408, 409, 429} or 500 <= status_code < 600

    error_name = type(exc).__name__.lower()
    return error_name in {
        "apiconnectionerror",
        "apitimeouterror",
        "authenticationerror",
        "permissiondeniederror",
        "ratelimiterror",
        "internalservererror",
    }


def call_with_api_key_rotation(
    api_keys: Sequence[str],
    operation: Callable[[str], T],
    *,
    should_retry: Callable[[Exception], bool] = is_retryable_api_error,
) -> T:
    if not api_keys:
        raise RuntimeError("No API keys configured")

    last_exc: Optional[Exception] = None
    for index, api_key in enumerate(api_keys):
        try:
            return operation(api_key)
        except Exception as exc:
            last_exc = exc
            if index >= len(api_keys) - 1 or not should_retry(exc):
                raise

    if last_exc is not None:
        raise last_exc
    raise RuntimeError("No API keys configured")

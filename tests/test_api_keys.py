from requests import HTTPError, Response

from src.utils.api_keys import (
    call_with_api_key_rotation,
    get_api_keys,
    get_matching_env_keys_for_bases,
    is_retryable_api_error,
)


def test_get_api_keys_supports_numbered_suffixes_and_case_insensitive_env():
    env = {
        "openai_api_key_2": "sk-two",
        "OPENAI_API_KEY": "sk-one",
        "OPENAI_API_KEY_3": "sk-three",
    }

    assert get_api_keys("OPENAI_API_KEY", env=env) == ["sk-one", "sk-two", "sk-three"]


def test_get_api_keys_includes_fallback_bases_without_duplicates():
    env = {
        "AIPING_API_KEY": "shared-key",
        "OPENAI_API_KEY": "shared-key",
        "OPENAI_API_KEY_2": "openai-backup",
        "SEEDANCE_API_KEY": "seedance-key",
    }

    assert get_api_keys(
        "AIPING_API_KEY",
        fallback_base_names=("OPENAI_API_KEY", "SEEDANCE_API_KEY"),
        env=env,
    ) == ["shared-key", "openai-backup", "seedance-key"]


def test_call_with_api_key_rotation_falls_back_on_retryable_error():
    attempts = []

    def _operation(api_key: str) -> str:
        attempts.append(api_key)
        if api_key == "primary":
            response = Response()
            response.status_code = 429
            error = HTTPError("rate limited")
            error.response = response
            raise error
        return f"ok:{api_key}"

    result = call_with_api_key_rotation(["primary", "backup"], _operation)

    assert result == "ok:backup"
    assert attempts == ["primary", "backup"]


def test_call_with_api_key_rotation_does_not_retry_non_retryable_error():
    attempts = []

    def _operation(api_key: str) -> str:
        attempts.append(api_key)
        response = Response()
        response.status_code = 400
        error = HTTPError("bad request")
        error.response = response
        raise error

    try:
        call_with_api_key_rotation(["primary", "backup"], _operation)
    except HTTPError:
        pass
    else:
        raise AssertionError("expected HTTPError")

    assert attempts == ["primary"]


def test_get_matching_env_keys_for_bases_returns_dynamic_openai_keys():
    env = {
        "OPENAI_API_KEY": "sk-one",
        "OPENAI_API_KEY_2": "sk-two",
        "AIPING_API_KEY": "aiping",
    }

    assert get_matching_env_keys_for_bases(("OPENAI_API_KEY",), env=env) == [
        "OPENAI_API_KEY",
        "OPENAI_API_KEY_2",
    ]


def test_is_retryable_api_error_recognizes_auth_errors():
    response = Response()
    response.status_code = 401
    error = HTTPError("unauthorized")
    error.response = response

    assert is_retryable_api_error(error) is True


def test_is_retryable_api_error_recognizes_payment_required():
    response = Response()
    response.status_code = 402
    error = HTTPError("payment required")
    error.response = response

    assert is_retryable_api_error(error) is True

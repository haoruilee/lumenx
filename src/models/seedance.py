"""Backward-compatible Seedance adapter.

This now delegates to the generic AIPing video adapter so all AIPing-hosted
video models share one implementation path.
"""

from typing import Any, Dict

from .aiping import AipingVideoModel


class SeedanceModel(AipingVideoModel):
    def __init__(self, config: Dict[str, Any]):
        super().__init__(config)

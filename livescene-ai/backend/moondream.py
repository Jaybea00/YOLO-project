"""
moondream.py — Moondream visual Q&A layer for LiveScene AI.

Moondream is a tiny but capable vision-language model that can answer
natural language questions about an image frame.

We use it for:
  - "What activity is happening in this scene?"
  - "Is anyone looking at the camera?"
  - "Describe the environment." 
  - Custom goal-based queries ("Is the restricted zone occupied?")

Falls back gracefully if model cannot be loaded (first run downloads ~1.7GB).
"""

from __future__ import annotations

import asyncio
import base64
import logging
import os
from io import BytesIO
from typing import List, Optional

logger = logging.getLogger(__name__)


# ─── Pre-built queries used for each frame ────────────────────────────────────

DEFAULT_QUERIES = [
    "What is the main activity happening in this scene?",
    "Describe the environment or setting briefly.",
]


# ─── MoondreamClient ─────────────────────────────────────────────────────────

class MoondreamClient:
    """
    Wraps the Moondream VL model.
    Supports both local model and the Moondream cloud API.
    """

    def __init__(self) -> None:
        self._model = None
        self._tokenizer = None
        self._cloud_client = None
        self._ready = False
        self._use_cloud = bool(os.getenv("MOONDREAM_API_KEY", ""))

    def load(self) -> bool:
        """
        Attempt to load Moondream.  Returns True if successful.
        Call this lazily on first use (model download ~1.7GB on first run).
        """
        if self._ready:
            return True

        if self._use_cloud:
            return self._load_cloud()
        return self._load_local()

    def _load_cloud(self) -> bool:
        try:
            import moondream as md  # type: ignore
            self._cloud_client = md.vl(api_key=os.getenv("MOONDREAM_API_KEY"))
            self._ready = True
            logger.info("✅ Moondream: cloud API connected")
            return True
        except Exception as e:
            logger.warning("Moondream cloud init failed: %s", e)
            return False

    def _load_local(self) -> bool:
        try:
            from transformers import AutoTokenizer, AutoModelForCausalLM  # type: ignore
            import torch  # type: ignore

            model_id = "vikhyatk/moondream2"
            revision  = "2024-08-26"

            logger.info("Loading Moondream locally (first run downloads ~1.7GB)…")
            self._tokenizer = AutoTokenizer.from_pretrained(model_id, revision=revision)
            self._model = AutoModelForCausalLM.from_pretrained(
                model_id,
                trust_remote_code=True,
                revision=revision,
                torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
            )
            device = "cuda" if torch.cuda.is_available() else "cpu"
            self._model = self._model.to(device)
            self._model.eval()
            self._ready = True
            logger.info("✅ Moondream: local model loaded on %s", device)
            return True
        except Exception as e:
            logger.warning("Moondream local load failed: %s", e)
            return False

    # ── Inference ─────────────────────────────────────────────────────────────

    async def answer(self, frame_b64: str, question: str) -> str:
        """Answer a single question about the given JPEG frame (base64)."""
        if not self._ready:
            if not self.load():
                return ""

        try:
            img_bytes = base64.b64decode(frame_b64)

            if self._use_cloud and self._cloud_client:
                return await self._answer_cloud(img_bytes, question)
            else:
                return await asyncio.to_thread(
                    self._answer_local, img_bytes, question
                )
        except Exception as e:
            logger.warning("Moondream answer failed: %s", e)
            return ""

    async def _answer_cloud(self, img_bytes: bytes, question: str) -> str:
        from PIL import Image  # type: ignore
        image = Image.open(BytesIO(img_bytes))
        result = await asyncio.to_thread(
            self._cloud_client.query, image, question
        )
        return result.get("answer", "")

    def _answer_local(self, img_bytes: bytes, question: str) -> str:
        from PIL import Image  # type: ignore
        image = Image.open(BytesIO(img_bytes))
        enc_image = self._model.encode_image(image)
        return self._model.answer_question(enc_image, question, self._tokenizer)

    async def describe_scene(
        self,
        frame_b64: str,
        queries: Optional[List[str]] = None,
    ) -> dict:
        """
        Run multiple Q&A queries over a single frame.
        Returns a dict mapping question → answer.
        """
        qs = queries or DEFAULT_QUERIES
        tasks = [self.answer(frame_b64, q) for q in qs]
        answers = await asyncio.gather(*tasks, return_exceptions=True)

        result: dict[str, str] = {}
        for q, a in zip(qs, answers):
            if isinstance(a, Exception):
                result[q] = ""
            else:
                result[q] = str(a)
        return result

    @property
    def is_ready(self) -> bool:
        return self._ready

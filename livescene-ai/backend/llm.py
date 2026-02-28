"""
llm.py — Multi-provider LLM narration engine for LiveScene AI.

Supports:
  • Google Gemini 2.0 Flash  (primary) — via google-genai SDK
  • OpenAI GPT-4o-mini       (fallback) — via openai v2 SDK
  • Local heuristic fallback  (always works offline)
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
from typing import List, Optional

logger = logging.getLogger(__name__)

# ─── Response schema ─────────────────────────────────────────────────────────

class NarrationResult:
    def __init__(
        self,
        narration: str,
        scene_description: str,
        confidence: float = 1.0,
        provider: str = "heuristic",
        insights: Optional[List[str]] = None,
    ) -> None:
        self.narration = narration
        self.scene_description = scene_description
        self.confidence = confidence
        self.provider = provider
        self.insights = insights or []

    def to_dict(self) -> dict:
        return {
            "narration": self.narration,
            "sceneDescription": self.scene_description,
            "confidence": self.confidence,
            "provider": self.provider,
            "insights": self.insights,
        }


# ─── Prompt builder ──────────────────────────────────────────────────────────

def build_prompt(
    objects: List[dict],
    memory_summary: str,
    events: Optional[List[dict]] = None,
) -> str:
    """Build a structured prompt for scene narration."""

    obj_lines = []
    for o in objects:
        conf_pct = int(o.get("confidence", 1.0) * 100)
        obj_lines.append(f"  - {o['label']} ({conf_pct}% confidence)")

    objects_block = "\n".join(obj_lines) if obj_lines else "  - (empty scene)"

    events_block = ""
    if events:
        recent = events[-5:]
        events_block = "\nRecent events:\n" + "\n".join(
            f"  - {e.get('description', '')}" for e in recent
        )

    return f"""You are LiveScene AI — a real-time visual narrator.

CURRENT OBJECTS IN FRAME:
{objects_block}

SCENE MEMORY:
{memory_summary}
{events_block}

Your task:
1. Write a single, natural, concise narration sentence (max 25 words) describing what is happening RIGHT NOW.
2. Write a 1-sentence scene description for logging (max 20 words).
3. List up to 2 brief insights if anything notable is happening.

Respond ONLY with valid JSON (no markdown, no code blocks):
{{
  "narration": "...",
  "sceneDescription": "...",
  "insights": ["...", "..."]
}}"""


# ─── Gemini provider (google-genai SDK >= 1.0) ───────────────────────────────

class GeminiNarrator:
    def __init__(self, api_key: str) -> None:
        from google import genai                        # type: ignore
        from google.genai import types as genai_types  # type: ignore
        self._client = genai.Client(api_key=api_key)
        self._types  = genai_types
        self._model  = "gemini-2.0-flash"

    async def narrate(
        self,
        objects: List[dict],
        memory_summary: str,
        events: Optional[List[dict]] = None,
        frame_b64: Optional[str] = None,
    ) -> NarrationResult:
        prompt = build_prompt(objects, memory_summary, events)

        try:
            contents: list = []

            if frame_b64:
                contents.append(
                    self._types.Part.from_bytes(
                        data=base64.b64decode(frame_b64),
                        mime_type="image/jpeg",
                    )
                )
            contents.append(prompt)

            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model,
                contents=contents,
            )

            text = (response.text or "").strip()
            text = re.sub(r"^```(?:json)?\n?", "", text)
            text = re.sub(r"\n?```$", "", text)

            parsed = json.loads(text)
            return NarrationResult(
                narration=parsed.get("narration", ""),
                scene_description=parsed.get("sceneDescription", ""),
                insights=parsed.get("insights", []),
                confidence=0.95,
                provider="gemini",
            )

        except Exception as exc:
            logger.warning("Gemini narration failed: %s", exc)
            raise

    async def ask(self, prompt: str) -> str:
        """Free-form text Q&A — used by the /api/ask voice endpoint."""
        try:
            response = await asyncio.to_thread(
                self._client.models.generate_content,
                model=self._model,
                contents=[prompt],
            )
            return (response.text or "").strip()
        except Exception as exc:
            logger.warning("Gemini ask() failed: %s", exc)
            raise


# ─── OpenAI provider (openai v2 SDK) ─────────────────────────────────────────

class OpenAINarrator:
    def __init__(self, api_key: str) -> None:
        from openai import AsyncOpenAI  # type: ignore
        self._client = AsyncOpenAI(api_key=api_key)

    async def narrate(
        self,
        objects: List[dict],
        memory_summary: str,
        events: Optional[List[dict]] = None,
        frame_b64: Optional[str] = None,
    ) -> NarrationResult:
        prompt = build_prompt(objects, memory_summary, events)

        content: list = [{"type": "text", "text": prompt}]
        if frame_b64:
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{frame_b64}",
                    "detail": "low",
                },
            })

        try:
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": content}],
                response_format={"type": "json_object"},
                max_tokens=200,
                temperature=0.4,
            )
            text = response.choices[0].message.content or "{}"
            parsed = json.loads(text)
            return NarrationResult(
                narration=parsed.get("narration", ""),
                scene_description=parsed.get("sceneDescription", ""),
                insights=parsed.get("insights", []),
                confidence=0.92,
                provider="openai",
            )
        except Exception as exc:
            logger.warning("OpenAI narration failed: %s", exc)
            raise

    async def ask(self, prompt: str) -> str:
        """Free-form text Q&A — used by the /api/ask voice endpoint."""
        try:
            response = await self._client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=150,
                temperature=0.5,
            )
            return response.choices[0].message.content or ""
        except Exception as exc:
            logger.warning("OpenAI ask() failed: %s", exc)
            raise


# ─── Heuristic fallback (offline) ────────────────────────────────────────────

class HeuristicNarrator:
    """Always works — simple rule-based narration."""

    async def narrate(
        self,
        objects: List[dict],
        memory_summary: str,
        events: Optional[List[dict]] = None,
        frame_b64: Optional[str] = None,
    ) -> NarrationResult:
        labels = [o["label"] for o in objects]

        if not labels:
            narration = "The scene is empty. Waiting for activity..."
        elif len(labels) == 1:
            narration = f"A {labels[0]} is visible in the scene."
        else:
            counts: dict[str, int] = {}
            for l in labels:
                counts[l] = counts.get(l, 0) + 1
            parts = [
                f"{c} {l}{'s' if c > 1 else ''}" if c > 1 else f"a {l}"
                for l, c in counts.items()
            ]
            narration = f"The scene contains {', '.join(parts)}."

        # Surface the most recent event as an insight
        insights = []
        if events:
            recent = events[-1]
            insights.append(recent.get("description", ""))

        return NarrationResult(
            narration=narration,
            scene_description=f"Scene with {len(labels)} object(s) detected.",
            insights=insights,
            confidence=0.5,
            provider="heuristic",
        )


# ─── Main LLMNarrator (auto-selects provider) ────────────────────────────────

class LLMNarrator:
    """
    Auto-selects the best available LLM provider.
    Priority: Gemini → OpenAI → Heuristic fallback.
    """

    def __init__(self) -> None:
        self._primary: Optional[GeminiNarrator | OpenAINarrator] = None
        self._fallback = HeuristicNarrator()
        self.provider_name = "heuristic"
        self._initialize()

    def _initialize(self) -> None:
        provider = os.getenv("LLM_PROVIDER", "gemini").lower()

        if provider == "gemini":
            key = os.getenv("GEMINI_API_KEY", "")
            if key and key != "your_gemini_api_key_here":
                try:
                    self._primary = GeminiNarrator(key)
                    self.provider_name = "gemini"
                    logger.info("✅ LLM provider: Gemini 2.0 Flash")
                    return
                except Exception as e:
                    logger.warning("Gemini init failed: %s", e)

        if provider in ("openai", "gpt") or not self._primary:
            key = os.getenv("OPENAI_API_KEY", "")
            if key and key != "your_openai_api_key_here":
                try:
                    self._primary = OpenAINarrator(key)
                    self.provider_name = "openai"
                    logger.info("✅ LLM provider: OpenAI GPT-4o-mini")
                    return
                except Exception as e:
                    logger.warning("OpenAI init failed: %s", e)

        logger.warning("⚠️  No LLM API key found — using heuristic narration.")
        logger.warning("   Set GEMINI_API_KEY in backend/.env")

    async def narrate(
        self,
        objects: List[dict],
        memory_summary: str,
        events: Optional[List[dict]] = None,
        frame_b64: Optional[str] = None,
    ) -> NarrationResult:
        if self._primary:
            try:
                return await self._primary.narrate(
                    objects, memory_summary, events, frame_b64
                )
            except Exception:
                logger.warning("Primary LLM failed, falling back to heuristic.")

        return await self._fallback.narrate(objects, memory_summary, events, frame_b64)

    async def ask(self, prompt: str) -> str:
        """
        Free-form text prompt → answer string.
        Used by the /api/ask voice Q&A endpoint.
        """
        if self._primary:
            try:
                return await self._primary.ask(prompt)
            except Exception as e:
                logger.warning("Primary LLM ask() failed: %s — falling back.", e)
        # Heuristic fallback
        return "I can see the objects in the scene, but I need the AI service to answer that question in detail."

    @property
    def is_ready(self) -> bool:
        return self._primary is not None


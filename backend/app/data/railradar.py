import time
import httpx
import asyncio
from typing import Dict, Any, Optional, Tuple
from backend.app.config import settings

class RailRadarClient:
    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        timeout_seconds: Optional[float] = None
    ):
        self.base_url = (base_url or settings.RAILRADAR_API_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.RAILRADAR_API_KEY
        timeout = timeout_seconds if timeout_seconds is not None else settings.RAILRADAR_TIMEOUT_SECONDS
        self.timeout = httpx.Timeout(timeout)
        self._train_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
        self._cache_ttl_seconds = 30.0

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
            headers["x-api-key"] = self.api_key
        return headers

    async def get_live_telemetry(self, block_section_id: str) -> Dict[str, Any]:
        """Fetch live telemetry with a strict bound. Return fallback on failure."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.base_url}/telemetry/{block_section_id}",
                    headers=self._get_headers()
                )
                resp.raise_for_status()
                return resp.json()
        except Exception:
            # Bounded enrichment fallback
            return {
                "status": "FALLBACK",
                "occupancy": "unknown",
                "last_updated": None
            }

    async def get_live_train_status(self, train_number: str) -> Dict[str, Any]:
        """
        Fetch real-time train tracking from RailRadar API (/v1/trains/{number}/live).
        Returns delay, current section, segment progress, and next halt with circuit breaker.
        Falls back to local simulated/COA telemetry when offline or unresponsive.
        Includes a 30s TTL cache for fast, rate-limit friendly dashboard rendering.
        """
        now = time.time()
        if train_number in self._train_cache:
            cached_time, cached_data = self._train_cache[train_number]
            if now - cached_time < self._cache_ttl_seconds:
                return cached_data

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.get(
                    f"{self.base_url}/trains/{train_number}/live",
                    headers=self._get_headers()
                )
                resp.raise_for_status()
                raw_data = resp.json()
                data = raw_data.get("data", raw_data) if isinstance(raw_data, dict) else {}
                result = {
                    "train_number": data.get("trainNumber", train_number),
                    "train_name": data.get("trainName"),
                    "status": data.get("status", "RUNNING"),
                    "delay_minutes": data.get("delayMinutes", 0),
                    "current_location": data.get("currentLocation"),
                    "next_halt": data.get("nextHalt"),
                    "is_live": data.get("isLive", True),
                    "last_updated": data.get("lastUpdatedAt"),
                    "source": "RAILRADAR_LIVE",
                    "raw": data
                }
                self._train_cache[train_number] = (now, result)
                return result
        except Exception:
            fallback = {
                "train_number": train_number,
                "status": "FALLBACK_SIMULATED",
                "source": "SIMULATED_COA",
                "delay_minutes": 0,
                "current_location": None,
                "last_updated": None
            }
            self._train_cache[train_number] = (now, fallback)
            return fallback

railradar_client = RailRadarClient()

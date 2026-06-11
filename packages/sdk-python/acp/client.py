"""HTTP transport to the Agent Control Plane ingest API.

Fails open: network/HTTP errors never propagate into the host agent. The SDK's
job is to observe, not to break production.
"""
from __future__ import annotations

import os
import time

import httpx


class Client:
    def __init__(
        self,
        api_key: str | None = None,
        endpoint: str | None = None,
        project: str | None = None,
        timeout: float = 5.0,
    ):
        self.api_key = api_key or os.getenv("ACP_API_KEY", "")
        self.endpoint = (endpoint or os.getenv("ACP_ENDPOINT", "http://localhost:8000")).rstrip("/")
        self.project = project
        self._http = httpx.Client(timeout=timeout)

    def _headers(self) -> dict[str, str]:
        h = {"Content-Type": "application/json"}
        if self.api_key:
            h["Authorization"] = f"Bearer {self.api_key}"
        return h

    def send_trace(self, payload: dict) -> dict | None:
        try:
            r = self._http.post(
                f"{self.endpoint}/v1/traces", json=payload, headers=self._headers()
            )
            r.raise_for_status()
            return r.json()
        except Exception:
            return None  # fail open

    def get_approval(self, approval_id: str) -> dict | None:
        try:
            r = self._http.get(
                f"{self.endpoint}/v1/approvals/{approval_id}", headers=self._headers()
            )
            r.raise_for_status()
            return r.json()
        except Exception:
            return None

    def wait_for_approval(self, approval_id: str, timeout: float = 300, interval: float = 2.0):
        """Poll until the approval resolves or the timeout elapses."""
        deadline = time.time() + timeout
        while time.time() < deadline:
            data = self.get_approval(approval_id)
            if data and data.get("status") in ("approved", "rejected", "expired"):
                return data
            time.sleep(interval)
        return {"status": "expired"}

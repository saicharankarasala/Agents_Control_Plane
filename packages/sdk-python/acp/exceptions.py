class ACPError(Exception):
    """Base error for the Agent Control Plane SDK."""


class ApprovalRejected(ACPError):
    """Raised when a human rejects a gated action."""


class ApprovalTimeout(ACPError):
    """Raised when an approval is not resolved within the timeout."""

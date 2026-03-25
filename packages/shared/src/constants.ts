export const DEFAULT_PORT = 3000;
export const DEFAULT_HOST = '0.0.0.0';

export const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds
export const AGENT_OFFLINE_TIMEOUT_MS = 90_000; // 90 seconds without heartbeat = offline
export const PAIRING_CODE_TTL_MS = 5 * 60_000; // 5 minutes
export const PAIRING_MAX_ATTEMPTS = 3;
export const POLL_INTERVAL_MS = 10_000; // 10 seconds

// Alphabet without ambiguous characters (no 0/O, 1/I/l)
export const PAIRING_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const PAIRING_CODE_LENGTH = 6;

export const SESSION_COOKIE_NAME = 'multimo_session';
export const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days


const AUTH_SESSION_STARTED_AT_KEY = "ai-mentor-auth-started-at";
export const AUTH_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const readStartedAt = () => {
  const rawStartedAt = localStorage.getItem(AUTH_SESSION_STARTED_AT_KEY);
  if (!rawStartedAt) {
    return null;
  }

  const startedAt = Number(rawStartedAt);
  return Number.isFinite(startedAt) ? startedAt : null;
};

export const startAuthSession = () => {
  localStorage.setItem(AUTH_SESSION_STARTED_AT_KEY, String(Date.now()));
};

export const ensureAuthSessionStarted = () => {
  if (readStartedAt() === null) {
    startAuthSession();
  }
};

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_SESSION_STARTED_AT_KEY);
};

export const isAuthSessionExpired = () => {
  const startedAt = readStartedAt();
  return startedAt !== null && Date.now() - startedAt >= AUTH_SESSION_MAX_AGE_MS;
};

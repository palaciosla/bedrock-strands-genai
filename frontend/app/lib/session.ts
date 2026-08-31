export function getSessionId(): string {
  const KEY = "restaurant_session_id";
  if (typeof window === "undefined") return "";
  let sessionId = localStorage.getItem(KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(KEY, sessionId);
  }
  return sessionId;
}

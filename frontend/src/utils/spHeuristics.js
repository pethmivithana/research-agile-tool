// Heuristic story point estimation helpers

export function estimateStoryPoints(title, description) {
  const text = (title + ' ' + description).toLowerCase();
  let base = /auth|login|oauth|biometric/.test(text) ? 5 : 3;
  const kwMatches = text.match(/integrate|migration|refactor|performance|security|analytics/g) || [];
  const kwScore = kwMatches.length;
  const cosineApprox = 0.6; // placeholder until similarity.js is used
  const sp = Math.min(13, Math.round(base + 0.5 * kwScore + 0.3 * (1 - cosineApprox) * 10));
  return sp;
}

// backend/src/controllers/ml.controller.js
export async function predictImpact(req, res, next) {
  try {
    const { change } = req.body;
    const impacts = {
      effortImpact: 0.2,
      scheduleRisk: 0.35,
      qualityRisk: 0.15,
      productivityChange: -0.1
    };
    res.json({ impacts, changeId: change?.id });
  } catch (e) { next(e); }
}

export async function getRecommendations(req, res, next) {
  try {
    const { impacts } = req.body;
    const rulesApplied = [];
    const recs = [];

    if ((impacts?.scheduleRisk || 0) > 0.3) {
      rulesApplied.push('SR>0.3');
      recs.push('Break down large stories; cap WIP in In Progress.');
      recs.push('Add buffer to sprint and re-negotiate scope early.');
    }
    if ((impacts?.qualityRisk || 0) > 0.2) {
      rulesApplied.push('QR>0.2');
      recs.push('Add mandatory In Review status and code reviews.');
      recs.push('Prioritize test coverage for impacted modules.');
    }
    if ((impacts?.productivityChange || 0) < 0) {
      rulesApplied.push('PC<0');
      recs.push('Limit context switching; cluster related tasks per assignee.');
    }
    res.json({ recommendations: recs, rulesApplied });
  } catch (e) { next(e); }
}

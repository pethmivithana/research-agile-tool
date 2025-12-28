import { api } from "./axiosClient.js"

export const ImpactApi = {
  // Analyze a backlog item (pre-sprint)
  analyzeBacklogItem: (workItemId) => api.get(`/impact/backlog/${workItemId}/analyze`),

  // Analyze impact of adding item to sprint (during planning)
  analyzeSprintLoad: (sprintId, workItemId) => api.get(`/impact/sprints/${sprintId}/items/${workItemId}/analyze`),

  // Analyze impact of new requirement mid-sprint
  analyzeMidSprintImpact: (sprintId, requirementData) =>
    api.post(`/impact/sprints/${sprintId}/analyze-impact`, requirementData),

  // Batch analyze multiple items
  batchAnalyze: (sprintId, workItemIds) => api.post("/impact/sprints/batch-analyze", { sprintId, workItemIds }),
}

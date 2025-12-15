"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "../../api/axiosClient.js"
import { useParams } from "react-router-dom"

export default function VelocityPanel() {
  const { spaceId } = useParams()

  const { data, isLoading, error } = useQuery({
    queryKey: ["velocity", spaceId],
    queryFn: async () => {
      const res = await api.get(`/spaces/${spaceId}/analytics/velocity`)
      return res.data
    },
    enabled: !!spaceId,
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-sm text-slate-500">Loading velocity...</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg p-4 border border-slate-200">
        <div className="text-sm text-red-600">Error loading velocity</div>
      </div>
    )
  }

  const getSpilloverColor = (rate) => {
    if (rate < 0.2) return "text-green-600 bg-green-50"
    if (rate < 0.4) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-4">
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <h3 className="font-bold text-slate-900">Team Velocity</h3>
      </div>

      <div className="space-y-3">
        <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs text-blue-600 font-medium mb-1">Average (Last 3 Sprints)</div>
          <div className="text-2xl font-bold text-blue-900">{data.avgLast3 || 0} SP</div>
        </div>

        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="text-xs text-green-600 font-medium mb-1">Predicted Capacity</div>
          <div className="text-2xl font-bold text-green-900">{data.predictedCapacity || 0} SP</div>
        </div>

        <div className={`rounded-lg p-3 border ${getSpilloverColor(data.spilloverRate || 0)}`}>
          <div className="text-xs font-medium mb-1">Spillover Rate</div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold">{((data.spilloverRate || 0) * 100).toFixed(0)}%</div>
            <div className="text-xs">
              {data.spilloverRate < 0.2 ? "Excellent" : data.spilloverRate < 0.4 ? "Good" : "Needs Attention"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

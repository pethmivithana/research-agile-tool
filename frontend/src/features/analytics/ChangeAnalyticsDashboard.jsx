"use client"

import { useParams } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { api } from "../../api/axiosClient.js"

export default function ChangeAnalyticsDashboard() {
  const { spaceId } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ["changes-analytics", spaceId],
    queryFn: async () => {
      const res = await api.get(`/spaces/${spaceId}/analytics/changes`)
      return res.data
    },
    enabled: !!spaceId,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card text-center py-12">
        <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        <p className="text-slate-600 font-medium">No analytics data available</p>
        <p className="text-sm text-slate-500 mt-1">Start tracking requirement changes to see analytics</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Change Analytics</h2>
        <p className="text-slate-600 mt-1">Insights into requirement changes and their patterns</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Requirement Changes Over Time */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900">Changes Over Time</h3>
          </div>
          {Object.keys(data.byDate || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.byDate).map(([d, count]) => (
                <div key={d} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-600">{new Date(d).toLocaleDateString()}</span>
                  <span className="badge badge-primary">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No data available</p>
          )}
        </div>

        {/* SP Added/Removed */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900">Story Points Delta</h3>
          </div>
          {Object.keys(data.spAddedRemoved || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.spAddedRemoved).map(([d, delta]) => (
                <div key={d} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm text-slate-600">{new Date(d).toLocaleDateString()}</span>
                  <span
                    className={`badge ${delta > 0 ? "badge-success" : delta < 0 ? "badge-danger" : "badge-secondary"}`}
                  >
                    {delta > 0 ? `+${delta}` : delta} SP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No data available</p>
          )}
        </div>

        {/* Work Type Distribution */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900">Work Type Distribution</h3>
          </div>
          {Object.keys(data.typeDist || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.typeDist).map(([type, n]) => (
                <div
                  key={type}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <span className="text-sm font-medium text-slate-700">{type}</span>
                  <span className="badge badge-secondary">{n}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No data available</p>
          )}
        </div>

        {/* Priority Changes */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <h3 className="font-bold text-slate-900">Priority Changes</h3>
          </div>
          {Object.keys(data.priorityChanges || {}).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(data.priorityChanges).map(([p, n]) => (
                <div key={p} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                  <span className="text-sm font-medium text-slate-700">{p}</span>
                  <span className="badge badge-warning">{n}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No data available</p>
          )}
        </div>
      </div>
    </div>
  )
}

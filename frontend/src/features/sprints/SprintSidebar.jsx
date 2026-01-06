"use client"

import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../api/axiosClient.js"
import SprintForm from "./SprintForm.jsx"

export default function SprintSidebar() {
  const { spaceId } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingSprint, setEditingSprint] = useState(null)

  const {
    data: sprints,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["sprints", spaceId],
    queryFn: async () => {
      const { data } = await api.get(`/spaces/${spaceId}/sprints`)
      return data
    },
    enabled: !!spaceId,
  })

  const startMut = useMutation({
    mutationFn: (id) => api.post(`/sprints/${id}/start`),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["sprints", spaceId] })
      navigate(`/spaces/${spaceId}/board/${vars}`)
    },
  })

  const completeMut = useMutation({
    mutationFn: (id) => api.post(`/sprints/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints", spaceId] }),
  })

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/sprints/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sprints", spaceId] }),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 bg-white border-r border-gray-200">
        <div className="text-gray-500 text-sm">Loading sprints...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 m-4">
        <p className="text-sm text-red-700">Error loading sprints</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-sm font-bold tracking-wide uppercase text-gray-700">Sprints</h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="p-1.5 hover:bg-blue-50 rounded transition-colors text-blue-600"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {sprints?.map((s) => (
          <div
            key={s._id}
            className={`group rounded-lg p-3 transition-all border ${
              s.status === "active"
                ? "bg-blue-50 border-blue-200 shadow-sm"
                : s.status === "completed"
                  ? "bg-gray-50 border-gray-200"
                  : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="text-sm font-semibold text-gray-900">{s.name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                  s.status === "active"
                    ? "bg-blue-600 text-white"
                    : s.status === "completed"
                      ? "bg-gray-400 text-white"
                      : "bg-gray-200 text-gray-700"
                }`}
              >
                {s.status}
              </span>
            </div>

            <p className="text-xs text-gray-600 line-clamp-1 mb-3">{s.goal || "No goal defined"}</p>

            <div className="flex items-center gap-2 flex-wrap">
              {s.status === "planned" && (
                <button
                  onClick={() => startMut.mutate(s._id)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  START
                </button>
              )}
              {s.status === "active" && (
                <>
                  <button
                    onClick={() => navigate(`/spaces/${spaceId}/board/${s._id}`)}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    OPEN BOARD
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm("End this sprint? Incomplete items will move to the next sprint.")) {
                        completeMut.mutate(s._id)
                      }
                    }}
                    className="text-[11px] font-bold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    END SPRINT
                  </button>
                </>
              )}
              {s.status !== "completed" && (
                <button
                  onClick={() => setEditingSprint(s)}
                  className="text-[11px] font-bold text-gray-500 hover:text-gray-700 transition-colors"
                >
                  EDIT
                </button>
              )}
              {s.status === "planned" && (
                <button
                  onClick={() => {
                    if (window.confirm("Delete this sprint?")) {
                      deleteMut.mutate(s._id)
                    }
                  }}
                  className="text-[11px] font-bold text-red-500 hover:text-red-700 transition-colors"
                >
                  DELETE
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(showForm || editingSprint) && (
        <div className="border-t border-gray-200 animate-in slide-in-from-bottom">
          <SprintForm
            sprint={editingSprint}
            onCreated={() => {
              setShowForm(false)
              setEditingSprint(null)
              qc.invalidateQueries({ queryKey: ["sprints", spaceId] })
            }}
            onCancel={() => {
              setShowForm(false)
              setEditingSprint(null)
            }}
          />
        </div>
      )}
    </div>
  )
}

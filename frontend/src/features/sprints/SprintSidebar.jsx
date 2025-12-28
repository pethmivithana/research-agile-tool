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
      navigate(`/sprints/${vars}/board`)
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
      <div className="flex items-center justify-center py-8">
        <div className="text-slate-500 text-sm">Loading sprints...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-700">Error loading sprints</p>
      </div>
    )
  }

  const getStatusColor = (status) => {
    if (status === "active") return "bg-green-100 text-green-800"
    if (status === "completed") return "bg-blue-100 text-blue-800"
    return "bg-slate-100 text-slate-800"
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-900">Sprints</h3>
        <button className="btn btn-primary text-sm py-1.5 px-3" onClick={() => setShowForm((s) => !s)}>
          {showForm ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          )}
        </button>
      </div>

      {(showForm || editingSprint) && (
        <div className="animate-in slide-in-from-top">
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

      <div className="space-y-3">
        {sprints?.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <p className="text-sm font-medium">No sprints yet</p>
            <p className="text-xs mt-1">Create your first sprint to get started</p>
          </div>
        ) : (
          sprints?.map((s) => (
            <div
              key={s._id}
              className="bg-slate-50 hover:bg-slate-100 rounded-lg p-3 border border-slate-200 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 text-sm">{s.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">{s.goal || "No goal set"}</p>
                </div>
                <span className={`badge text-xs ${getStatusColor(s.status)}`}>{s.status}</span>
              </div>

              {s.startDate && (
                <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {new Date(s.startDate).toLocaleDateString()} →{" "}
                  {s.endDate ? new Date(s.endDate).toLocaleDateString() : "—"}
                </div>
              )}

              <div className="flex gap-2 mt-3">
                {s.status === "planned" && (
                  <>
                    <button
                      className="btn btn-primary text-xs py-1 px-2 flex-1"
                      onClick={() => startMut.mutate(s._id)}
                      disabled={startMut.isLoading}
                    >
                      Start Sprint
                    </button>
                    <button className="btn btn-ghost text-xs py-1 px-2" onClick={() => setEditingSprint(s)}>
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-700 text-xs py-1 px-2"
                      onClick={() => {
                        if (window.confirm("Are you sure you want to delete this sprint?")) {
                          deleteMut.mutate(s._id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </>
                )}
                {s.status === "active" && (
                  <>
                    <button
                      className="btn btn-primary text-xs py-1 px-2 flex-1"
                      onClick={() => navigate(`/sprints/${s._id}/board`)}
                    >
                      Open Board
                    </button>
                    <button
                      className="btn btn-ghost text-xs py-1 px-2"
                      onClick={() => navigate(`/sprints/${s._id}/impact`)}
                      title="Analyze mid-sprint impact"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                    </button>
                    <button
                      className="btn bg-green-600 text-white hover:bg-green-700 text-xs py-1 px-2"
                      onClick={() => completeMut.mutate(s._id)}
                      disabled={completeMut.isLoading}
                    >
                      Complete
                    </button>
                  </>
                )}
                {s.status === "completed" && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Sprint completed
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

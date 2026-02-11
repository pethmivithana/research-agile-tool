"use client"

import { useState } from "react"
import { useParams } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../api/axiosClient.js"
import BacklogItemForm from "./BackLogItemForm.jsx"

export default function BacklogPage() {
  const { spaceId } = useParams()
  const qc = useQueryClient()
  const [selected, setSelected] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [selectedSprint, setSelectedSprint] = useState("")

  const { data: backlog, isLoading: backlogLoading } = useQuery({
    queryKey: ["backlog", spaceId],
    queryFn: async () => {
      const { data } = await api.get(`/backlog/${spaceId}`)
      return data
    },
    enabled: !!spaceId,
  })

  const { data: sprints } = useQuery({
    queryKey: ["sprints", spaceId],
    queryFn: async () => {
      const { data } = await api.get(`/sprints/${spaceId}`)
      return data
    },
    enabled: !!spaceId,
  })

  const addToSprintMut = useMutation({
    mutationFn: (sprintId) => api.post(`/sprints/${sprintId}/add-items`, { itemIds: selected }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog", spaceId] })
      qc.invalidateQueries({ queryKey: ["sprints", spaceId] })
      setSelected([])
      setSelectedSprint("")
    },
  })

  const deleteMut = useMutation({
    mutationFn: (itemId) => api.delete(`/work-items/${itemId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backlog", spaceId] })
    },
  })

  if (backlogLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading backlog...</div>
      </div>
    )
  }

  const getPriorityColor = (priority) => {
    const colors = {
      Highest: "bg-red-100 text-red-800",
      High: "bg-orange-100 text-orange-800",
      Medium: "bg-yellow-100 text-yellow-800",
      Low: "bg-blue-100 text-blue-800",
      Lowest: "bg-slate-100 text-slate-800",
    }
    return colors[priority] || colors.Medium
  }

  const getTypeIcon = (type) => {
    if (type === "Bug")
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V9a1 1 0 11-2 0V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
        </svg>
      )
    if (type === "Story")
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      )
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Product Backlog</h2>
          <p className="text-slate-600 mt-1">Manage and prioritize your work items</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm || editingItem ? "Cancel" : "Create Item"}
        </button>
      </div>

      {/* Create/Edit Form */}
      {(showForm || editingItem) && (
        <div className="animate-in slide-in-from-top">
          <BacklogItemForm
            item={editingItem}
            onCreated={() => {
              qc.invalidateQueries({ queryKey: ["backlog", spaceId] })
              setShowForm(false)
              setEditingItem(null)
            }}
            onCancel={() => {
              setShowForm(false)
              setEditingItem(null)
            }}
          />
        </div>
      )}

      {/* Selected Items Actions */}
      {selected.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-medium text-blue-900">{selected.length} item(s) selected</span>
              <button className="text-sm text-blue-600 hover:text-blue-700 font-medium" onClick={() => setSelected([])}>
                Clear selection
              </button>
            </div>
            <div className="flex gap-3 items-center">
              <select
                className="select text-sm"
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
              >
                <option value="">Select sprint...</option>
                {sprints
                  ?.filter((s) => s.status === "planned" || s.status === "active")
                  .map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.name} ({s.status})
                    </option>
                  ))}
              </select>
              <button
                onClick={() => selectedSprint && addToSprintMut.mutate(selectedSprint)}
                disabled={!selectedSprint || addToSprintMut.isPending}
                className="btn btn-primary text-sm"
              >
                {addToSprintMut.isPending ? "Adding..." : "Add to Sprint"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backlog Items List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300"
                    checked={selected.length === backlog?.length && backlog?.length > 0}
                    onChange={(e) => setSelected(e.target.checked ? backlog.map((i) => i._id) : [])}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">SP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {backlog?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="text-slate-400">
                      <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      <p className="text-sm font-medium">No backlog items yet</p>
                      <p className="text-xs mt-1">Create your first work item to get started</p>
                    </div>
                  </td>
                </tr>
              ) : (
                backlog?.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300"
                        checked={selected.includes(item._id)}
                        onChange={(e) =>
                          setSelected((s) => (e.target.checked ? [...s, item._id] : s.filter((id) => id !== item._id)))
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-slate-600">
                        {getTypeIcon(item.type)}
                        <span className="text-sm font-medium">{item.type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.title}</div>
                      {item.description && <div className="text-sm text-slate-500 mt-1 line-clamp-1">{item.description}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${getPriorityColor(item.priority)}`}>{item.priority}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge badge-primary">{item.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-semibold text-slate-700">{item.storyPoints || "—"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          onClick={() => setEditingItem(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                          onClick={() => {
                            if (window.confirm("Are you sure you want to delete this item?")) {
                              deleteMut.mutate(item._id)
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

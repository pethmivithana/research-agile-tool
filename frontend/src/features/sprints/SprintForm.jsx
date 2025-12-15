"use client"

import { useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../api/axiosClient.js"

export default function SprintForm({ sprint, onCreated, onCancel }) {
  const { spaceId } = useParams()
  const qc = useQueryClient()
  const [name, setName] = useState(sprint?.name || "")
  const [goal, setGoal] = useState(sprint?.goal || "")
  const [duration, setDuration] = useState(sprint?.duration || "2w")
  const [loading, setLoading] = useState(false)

  const createMut = useMutation({
    mutationFn: () => {
      if (sprint) {
        return api.patch(`/sprints/${sprint._id}`, { name, goal, duration })
      }
      return api.post(`/spaces/${spaceId}/sprints`, { name, goal, duration })
    },
    onSuccess: () => {
      qc.invalidateQueries(["sprints", spaceId])
      onCreated?.()
      if (!sprint) {
        setName("")
        setGoal("")
        setDuration("2w")
      }
    },
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createMut.mutateAsync()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 border border-slate-200 space-y-3">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-slate-900">{sprint ? "Edit Sprint" : "Create Sprint"}</h4>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div>
        <label className="label text-xs">Sprint Name *</label>
        <input
          className="input text-sm"
          placeholder="e.g., Sprint 1, Q1 Sprint"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label text-xs">Duration</label>
        <select className="select text-sm" value={duration} onChange={(e) => setDuration(e.target.value)}>
          <option value="1w">1 week</option>
          <option value="2w">2 weeks</option>
          <option value="3w">3 weeks</option>
          <option value="4w">4 weeks</option>
          <option value="custom">Custom</option>
        </select>
      </div>

      <div>
        <label className="label text-xs">Sprint Goal</label>
        <textarea
          className="input text-sm min-h-[60px]"
          placeholder="What do you want to achieve in this sprint?"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={2}
        />
      </div>

      <button type="submit" className="btn btn-primary w-full text-sm" disabled={loading || !name}>
        {loading ? (sprint ? "Updating..." : "Creating...") : sprint ? "Update Sprint" : "Create Sprint"}
      </button>
    </form>
  )
}

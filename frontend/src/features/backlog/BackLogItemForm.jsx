"use client"

import { useState, useEffect } from "react"
import { api } from "../../api/axiosClient.js"
import { useHeuristicSP } from "../../hooks/useHeuristicSP.js"
import { useParams } from "react-router-dom"

export default function BacklogItemForm({ item, onCreated, onCancel }) {
  const { spaceId } = useParams()
  const [type, setType] = useState(item?.type || "Task")
  const [status, setStatus] = useState(item?.status || "To Do")
  const [title, setTitle] = useState(item?.title || "")
  const [description, setDescription] = useState(item?.description || "")
  const [priority, setPriority] = useState(item?.priority || "Medium")
  const [storyPoints, setStoryPoints] = useState(item?.storyPoints || "")
  const [loading, setLoading] = useState(false)
  const { estimate } = useHeuristicSP()

  useEffect(() => {
    if (title || description) {
      const estimated = estimate(title, description)
      setStoryPoints(estimated)
    }
  }, [title, description, estimate])

  useEffect(() => {
    if (type === "Bug") {
      setStatus("Triaged")
    } else if (type === "Story") {
      setStatus("Design WIP")
    } else if (!item) {
      setStatus("To Do")
    }
  }, [type, item])

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        type,
        status,
        title,
        description,
        priority,
        storyPoints: Number(storyPoints) || undefined,
      }

      if (item) {
        await api.patch(`/work-items/${item._id}`, payload)
      } else {
        await api.post(`/spaces/${spaceId}/backlog`, payload)
      }

      onCreated?.()

      if (!item) {
        setTitle("")
        setDescription("")
        setStoryPoints("")
      }
    } catch (error) {
      console.error("Failed to save backlog item:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusOptions = () => {
    if (type === "Bug") {
      return ["Triaged", "Fixed"]
    } else if (type === "Story") {
      return ["Design WIP", "Design Review", "Ready for Development"]
    } else {
      return ["To Do", "In Progress", "Done"]
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-slate-900">{item ? "Edit Work Item" : "Create Work Item"}</h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value)}>
            <option>Bug</option>
            <option>Story</option>
            <option>Task</option>
            <option>Subtask</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="select" value={status} onChange={(e) => setStatus(e.target.value)}>
            {getStatusOptions().map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="label">Title *</label>
        <input
          className="input"
          placeholder="Enter a descriptive title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="textarea"
          placeholder="Provide details about this work item"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Priority</label>
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option>Highest</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
            <option>Lowest</option>
          </select>
        </div>
        <div>
          <label className="label">Story Points</label>
          <input
            className="input"
            type="number"
            placeholder="Auto-estimated"
            value={storyPoints}
            onChange={(e) => setStoryPoints(e.target.value)}
            min="0"
          />
          {storyPoints && (
            <p className="text-xs text-slate-500 mt-1">
              {Number(storyPoints) === estimate(title, description) ? "Auto-estimated" : "Manually adjusted"}
            </p>
          )}
        </div>
      </div>

      <button type="submit" className="btn btn-primary w-full" disabled={loading || !title}>
        {loading ? (item ? "Updating..." : "Creating...") : item ? "Update Work Item" : "Create Work Item"}
      </button>
    </form>
  )
}

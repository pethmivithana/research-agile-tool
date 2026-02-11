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
  const { estimate } = useHeuristicSP()
  const [loading, setLoading] = useState(false)

  const fibonacciScale = [1, 2, 3, 5, 8, 13, 21]

  const getStatusOptions = (type) => {
    switch (type) {
      case "Bug":
        return ["Triaged", "Fixed"]
      case "Story":
        return ["Design WIP", "Design Review", "Ready for Development"]
      case "Task":
      case "Subtask":
      default:
        return ["To Do", "In Progress", "Done"]
    }
  }

  useEffect(() => {
    if (!item) {
      const options = getStatusOptions(type)
      setStatus(options[0])
    }
  }, [type, item])

  const getRecommendation = () => {
    if (!title) return
    const estimated = estimate(title, description)
    setStoryPoints(estimated)
  }

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
        await api.post(`/backlog/${spaceId}`, payload)
      }
      onCreated?.()
    } catch (error) {
      console.error("Failed to save backlog item:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg space-y-0"
    >
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-700">
          {item ? "Update Work Item" : "Create Work Item"}
        </h3>
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Type</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option>Story</option>
              <option>Task</option>
              <option>Bug</option>
              <option>Subtask</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {getStatusOptions(type).map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</label>
          <input
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What needs to be done?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Description</label>
          <textarea
            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[120px]"
            placeholder="Details, acceptance criteria..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Priority</label>
            <select
              className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option>Highest</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
              <option>Lowest</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Story Points</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                type="number"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
              />
              <button
                type="button"
                onClick={getRecommendation}
                className="px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                disabled={!title}
              >
                Suggest
              </button>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="flex flex-wrap gap-2">
            {fibonacciScale.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setStoryPoints(val)}
                className={`w-11 h-11 rounded-lg border-2 font-bold text-sm transition-all ${
                  Number(storyPoints) === val
                    ? "border-blue-600 bg-blue-600 text-white shadow-md"
                    : "border-gray-300 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50"
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-200 flex gap-3">
        <button
          type="submit"
          className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-lg text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-sm"
          disabled={loading || !title}
        >
          {loading ? "SAVING..." : item ? "UPDATE ITEM" : "CREATE ITEM"}
        </button>
      </div>
    </form>
  )
}

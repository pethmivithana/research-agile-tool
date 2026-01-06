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
  const [startDate, setStartDate] = useState(sprint?.startDate || "")
  const [loading, setLoading] = useState(false)

  const createMut = useMutation({
    mutationFn: () => {
      if (sprint) {
        return api.patch(`/sprints/${sprint._id}`, { name, goal, duration, startDate })
      }
      return api.post(`/spaces/${spaceId}/sprints`, { name, goal, duration, startDate })
    },
    onSuccess: () => {
      qc.invalidateQueries(["sprints", spaceId])
      onCreated?.()
      if (!sprint) {
        setName("")
        setGoal("")
        setDuration("2w")
        setStartDate("")
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
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-white/10 rounded-lg p-4 space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase">Sprint Name</label>
        <input
          className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm focus:border-white/20 outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Duration</label>
          <select
            className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          >
            <option value="1w">1 Week</option>
            <option value="2w">2 Weeks</option>
            <option value="3w">3 Weeks</option>
            <option value="4w">4 Weeks</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Start Date</label>
          <input
            type="date"
            className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase">Sprint Goal</label>
        <textarea
          className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm min-h-[80px] outline-none"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" className="flex-1 bg-white text-black font-bold py-2 rounded text-sm hover:bg-zinc-200">
          {sprint ? "Save Changes" : "Create Sprint"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-white/10 rounded text-sm hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

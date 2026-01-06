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
<<<<<<< HEAD
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-6 space-y-5 shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900">Sprint Name</label>
        <input
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
=======
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-white/10 rounded-lg p-4 space-y-4">
      <div className="space-y-1">
        <label className="text-[10px] font-bold text-zinc-500 uppercase">Sprint Name</label>
        <input
          className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm focus:border-white/20 outline-none"
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Sprint 15 - Authentication"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
<<<<<<< HEAD
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">Duration</label>
          <select
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
=======
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Duration</label>
          <select
            className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none"
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
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
<<<<<<< HEAD
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-900">Start Date</label>
          <input
            type="date"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
=======
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Start Date</label>
          <input
            type="date"
            className="w-full bg-black border border-white/10 rounded px-3 py-2 text-sm outline-none"
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
      </div>

<<<<<<< HEAD
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-gray-900">Sprint Goal</label>
        <textarea
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[100px] resize-none"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Define what this sprint aims to achieve..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {sprint ? "Saving..." : "Creating..."}
            </>
          ) : sprint ? (
            "Save Changes"
          ) : (
            "Create Sprint"
          )}
=======
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
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
        </button>
        <button
          type="button"
          onClick={onCancel}
<<<<<<< HEAD
          className="px-6 py-2.5 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition-colors"
=======
          className="px-4 py-2 border border-white/10 rounded text-sm hover:bg-white/5"
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

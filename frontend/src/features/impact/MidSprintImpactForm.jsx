"use client"

import { useState } from "react"
import { useParams } from "react-router-dom"
import { useMutation } from "@tanstack/react-query"
import { ImpactApi } from "../../api/impactApi.js"

export default function MidSprintImpactForm() {
  const { sprintId } = useParams()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    storyPoints: "",
    priority: "Medium",
  })
  const [result, setResult] = useState(null)

  const analyzeMutation = useMutation({
    mutationFn: (data) => ImpactApi.analyzeMidSprintImpact(sprintId, data),
    onSuccess: (response) => {
      setResult(response.data)
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    analyzeMutation.mutate({
      ...formData,
      storyPoints: Number.parseInt(formData.storyPoints) || 0,
    })
  }

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Mid-Sprint Impact Analyzer</h2>
        <p className="text-slate-600 mb-6">Analyze the impact of adding a new requirement to the active sprint</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Add Face Recognition Login"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Integrate AWS Rekognition API to allow users to log in using their face. Must work on iOS and Android. High security required."
            />
            <p className="text-xs text-slate-500 mt-1">Detailed descriptions improve prediction accuracy</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Story Points *</label>
              <input
                type="number"
                name="storyPoints"
                value={formData.storyPoints}
                onChange={handleChange}
                required
                min="0"
                max="100"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 10"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority *</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="Lowest">Lowest</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Highest">Highest</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={analyzeMutation.isPending}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {analyzeMutation.isPending ? "Analyzing..." : "Analyze Impact"}
          </button>
        </form>
      </div>

      {analyzeMutation.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">Error analyzing impact</p>
          <p className="text-red-600 text-sm mt-1">{analyzeMutation.error.message}</p>
        </div>
      )}

      {result && <ImpactResultDisplay result={result} />}
    </div>
  )
}

function ImpactResultDisplay({ result }) {
  const getDecisionColor = (decision) => {
    if (decision.includes("DO NOT")) return "bg-red-50 border-red-300 text-red-900"
    if (decision.includes("CAUTION")) return "bg-yellow-50 border-yellow-300 text-yellow-900"
    return "bg-green-50 border-green-300 text-green-900"
  }

  const getRiskColor = (level) => {
    if (level === "Critical") return "text-red-600 bg-red-100"
    if (level === "High") return "text-orange-600 bg-orange-100"
    if (level === "Medium") return "text-yellow-600 bg-yellow-100"
    return "text-green-600 bg-green-100"
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Decision Banner */}
      <div className={`border-2 rounded-lg p-4 ${getDecisionColor(result.decision)}`}>
        <h3 className="text-2xl font-bold mb-2">{result.decision}</h3>
        <ul className="space-y-1">
          {result.reasons.map((reason, idx) => (
            <li key={idx} className="text-sm">
              • {reason}
            </li>
          ))}
        </ul>
      </div>

      {/* Analysis Summary */}
      <div className="bg-slate-50 rounded-lg p-4">
        <h4 className="font-bold text-slate-900 mb-3">Analysis Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-slate-600">Predicted Effort</p>
            <p className="text-lg font-bold text-slate-900">{result.analysis_summary.predicted_hours} hours</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Hours Available</p>
            <p className="text-lg font-bold text-slate-900">{result.analysis_summary.hours_available} hours</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Spillover Probability</p>
            <p className="text-lg font-bold text-red-600">{result.analysis_summary.spillover_probability}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600">Productivity Impact</p>
            <p className="text-lg font-bold text-orange-600">{result.analysis_summary.productivity_drop}</p>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Effort */}
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-slate-700">Effort</h5>
            <span className={`text-xs px-2 py-1 rounded ${getRiskColor(result.effort.status)}`}>
              {result.effort.status}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{result.effort.predicted_hours}h</p>
          <p className="text-xs text-slate-500 mt-1">Confidence: {(result.effort.confidence * 100).toFixed(0)}%</p>
        </div>

        {/* Schedule Risk */}
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-slate-700">Schedule Risk</h5>
            <span className={`text-xs px-2 py-1 rounded ${getRiskColor(result.schedule_risk.risk_level)}`}>
              {result.schedule_risk.risk_level}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{(result.schedule_risk.probability * 100).toFixed(0)}%</p>
          <p className="text-xs text-slate-500 mt-1">Probability</p>
        </div>

        {/* Quality Risk */}
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-slate-700">Quality Risk</h5>
            <span className={`text-xs px-2 py-1 rounded ${getRiskColor(result.quality_risk.risk_level)}`}>
              {result.quality_risk.risk_level}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">{(result.quality_risk.probability * 100).toFixed(0)}%</p>
          <p className="text-xs text-slate-500 mt-1">Defect Probability</p>
        </div>

        {/* Productivity */}
        <div className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-medium text-slate-700">Productivity</h5>
            <span
              className={`text-xs px-2 py-1 rounded ${
                result.productivity_impact.impact_percentage < -10
                  ? "text-red-600 bg-red-100"
                  : "text-slate-600 bg-slate-100"
              }`}
            >
              {result.productivity_impact.status}
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {result.productivity_impact.impact_percentage > 0 ? "+" : ""}
            {result.productivity_impact.impact_percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Velocity Change</p>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="space-y-4">
        {result.schedule_risk.factors.length > 0 && (
          <div>
            <h5 className="font-medium text-slate-700 mb-2">Schedule Factors:</h5>
            <ul className="space-y-1">
              {result.schedule_risk.factors.map((factor, idx) => (
                <li key={idx} className="text-sm text-slate-600">
                  • {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.quality_risk.factors.length > 0 && (
          <div>
            <h5 className="font-medium text-slate-700 mb-2">Quality Factors:</h5>
            <ul className="space-y-1">
              {result.quality_risk.factors.map((factor, idx) => (
                <li key={idx} className="text-sm text-slate-600">
                  • {factor}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

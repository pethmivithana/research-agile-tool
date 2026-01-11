"use client"

import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { api } from "../../api/axiosClient.js"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  AlertCircle,
  CheckCircle2,
  Zap,
  ShieldAlert,
  BarChart3,
  Clock,
  Sparkles,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"

const getScheduleRiskUI = (prob) => {
  const p = prob * 100
  if (p >= 75)
    return {
      level: "Critical",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      badge: "Critical Risk",
    }
  if (p >= 55)
    return {
      level: "High",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      badge: "High Risk",
    }
  if (p >= 35)
    return {
      level: "Moderate",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      badge: "Moderate Risk",
    }
  return {
    level: "Low",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    badge: "Low Risk",
  }
}

const getQualityRiskUI = (prob) => {
  const p = prob * 100
  if (p >= 70)
    return {
      level: "High",
      color: "text-red-600",
      bgColor: "bg-red-50",
    }
  if (p >= 40)
    return {
      level: "Moderate",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    }
  return {
    level: "Low",
    color: "text-green-600",
    bgColor: "bg-green-50",
  }
}

export default function RequirementChangePage() {
  const { spaceId } = useParams()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    storyPoints: "3",
    priority: "Medium",
    type: "Story",
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [recommendingSP, setRecommendingSP] = useState(false)
  const [spRecommendation, setSpRecommendation] = useState(null)
  const [activeSprint, setActiveSprint] = useState(null)

  const { data: sprints = [], isLoading: sprintsLoading } = useQuery({
    queryKey: ["sprints", spaceId],
    queryFn: async () => {
      const response = await api.get(`/spaces/${spaceId}/sprints`)
      return response.data
    },
    enabled: !!spaceId,
  })

  useEffect(() => {
    if (sprints && sprints.length > 0) {
      const active = sprints.find((s) => s.status === "active")
      if (active) {
        setActiveSprint(active)
      } else {
        setActiveSprint(null)
      }
    }
  }, [sprints])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "title" || name === "description") {
      setSpRecommendation(null)
    }
    setError(null)
    setSuccessMessage(null)
  }

  const getSPRecommendation = async () => {
    if (!formData.title) return
    setRecommendingSP(true)
    try {
      const response = await api.post("/analytics/recommend-sp", {
        title: formData.title,
        description: formData.description,
        type: "Story",
        priority: formData.priority,
        spaceId,
      })
      setSpRecommendation(response.data)
      setFormData((prev) => ({ ...prev, storyPoints: response.data.recommended_story_point.toString() }))
    } catch (err) {
      console.error("SP Recommendation Error:", err)
    } finally {
      setRecommendingSP(false)
    }
  }

  const analyzeImpact = async (e) => {
    e.preventDefault()
    if (!activeSprint) {
      setError("No active sprint found. Please start a sprint to analyze impact.")
      return
    }

    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    setResult(null)
    setSelectedOption(null)

    try {
      const response = await api.post(`/impact/sprints/${activeSprint._id}/analyze-impact`, formData)
      setResult(response.data)

      if (response.data.recommendations?.primary_recommendation) {
        setSelectedOption(response.data.recommendations.primary_recommendation)
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze impact. Please try again.")
      console.error("Analysis Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const applyDecision = async () => {
    if (!selectedOption || !activeSprint) {
      setError("Please select a recommendation option")
      return
    }

    setApplying(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const response = await api.post(`/impact/sprints/${activeSprint._id}/apply-recommendation`, {
        option: selectedOption,
        itemData: {
          title: formData.title,
          description: formData.description,
          storyPoints: Number(formData.storyPoints),
          priority: formData.priority,
          type: formData.type,
        },
      })

      setSuccessMessage(response.data.message)

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["sprints", spaceId] })
      queryClient.invalidateQueries({ queryKey: ["backlog", spaceId] })

      // Reset form after successful application
      setTimeout(() => {
        setResult(null)
        setSelectedOption(null)
        setFormData({
          title: "",
          description: "",
          storyPoints: "3",
          priority: "Medium",
          type: "Story",
        })
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      console.error("Apply Error:", err)
      setError(err.response?.data?.error || "Failed to apply recommendation. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* LEFT: INPUT FORM */}
          <div className="lg:col-span-1">
            <div className="space-y-4 mb-8">
              <h1 className="text-3xl font-bold text-gray-900">New Requirement</h1>
              <p className="text-gray-600">Analyze impact and get AI-powered recommendations</p>

              {sprintsLoading ? (
                <p className="text-xs text-gray-500">Loading sprints...</p>
              ) : activeSprint ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs text-green-600 font-medium">Active Sprint: {activeSprint.name}</p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium">⚠️ No active sprint</p>
                  <p className="text-xs text-amber-600 mt-1">Start a sprint to analyze impact</p>
                </div>
              )}
            </div>

            <form onSubmit={analyzeImpact} className="space-y-5 bg-white border border-gray-200 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Title *</label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="e.g., Add Face ID Login"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Technical details..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Story Points *</label>
                  <div className="flex gap-2">
                    <input
                      name="storyPoints"
                      type="number"
                      value={formData.storyPoints}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                      min="1"
                      max="21"
                    />
                    <button
                      type="button"
                      onClick={getSPRecommendation}
                      disabled={recommendingSP || !formData.title}
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors disabled:opacity-50"
                      title="Get AI Suggestion"
                    >
                      {recommendingSP ? (
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                      ) : (
                        <Sparkles size={18} />
                      )}
                    </button>
                  </div>
                  {spRecommendation && (
                    <p className="text-xs text-blue-600 mt-1.5">
                      AI suggests: {spRecommendation.recommended_story_point} SP
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Priority *</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option>Lowest</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Highest</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !activeSprint}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors flex justify-center items-center gap-2 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap size={18} /> Analyze Impact
                  </>
                )}
              </button>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-start gap-3 animate-in fade-in">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-start gap-3 animate-in fade-in">
                  <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{successMessage}</p>
                </div>
              )}
            </form>
          </div>

          {/* RIGHT: RESULTS DASHBOARD */}
          <div className="lg:col-span-2">
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Impact Analysis</h2>
                  <span className="text-xs font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                    {result.models_status?.effort ? "ML Online" : "Fallback"}
                  </span>
                </div>

                {/* METRICS GRID */}
                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    title="AI Effort Estimate"
                    value={`${result.predicted_hours} hrs`}
                    subValue={result.confidence_interval || "Quantile Regression"}
                    icon={<Clock className="text-blue-600" size={24} />}
                  />

                  {result.schedule_risk && (
                    <RiskCard
                      title="Schedule Risk"
                      {...getScheduleRiskUI(result.schedule_risk.probability)}
                      icon={<TrendingUp className="text-blue-600" size={24} />}
                    />
                  )}

                  {result.productivity_impact && (
                    <MetricCard
                      title="Productivity Delay"
                      value={result.productivity_impact.days}
                      subValue={`Drop: ${result.productivity_impact.drop}`}
                      icon={<AlertTriangle className="text-amber-600" size={24} />}
                    />
                  )}

                  {result.quality_risk && (
                    <RiskCard
                      title="Quality Risk"
                      {...getQualityRiskUI(result.quality_risk.probability)}
                      icon={<ShieldAlert className="text-red-600" size={24} />}
                    />
                  )}
                </div>

                {/* RECOMMENDATIONS */}
                {result.recommendations && (
                  <div className="space-y-5">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <CheckCircle2 size={20} className="text-blue-600" />
                        <h3 className="font-bold text-gray-900">Recommended Actions</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                          Select one option
                        </span>
                      </div>

                      <div className="space-y-3">
                        {result.recommendations.primary_recommendation && (
                          <RecommendationCard
                            option={result.recommendations.primary_recommendation}
                            isSelected={selectedOption?.id === result.recommendations.primary_recommendation.id}
                            onSelect={() => setSelectedOption(result.recommendations.primary_recommendation)}
                            isPrimary={true}
                          />
                        )}

                        {result.recommendations.alternative_options?.map((option) => (
                          <RecommendationCard
                            key={option.id}
                            option={option}
                            isSelected={selectedOption?.id === option.id}
                            onSelect={() => setSelectedOption(option)}
                            isPrimary={false}
                          />
                        ))}
                      </div>

                      <button
                        onClick={applyDecision}
                        disabled={!selectedOption || applying}
                        className={`w-full mt-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                          selectedOption && !applying
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                            : "bg-gray-200 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {applying ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Applying...
                          </>
                        ) : (
                          <>
                            <Zap size={18} />
                            Apply Selected Recommendation
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 min-h-[400px]">
                <div className="p-3 bg-white rounded-full mb-4">
                  <BarChart3 size={32} className="text-gray-400" />
                </div>
                <p className="text-gray-500 font-medium">Fill out the form to analyze impact</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subValue, icon }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-blue-50 rounded-lg">{icon}</div>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-gray-500">{subValue}</p>
      </div>
    </div>
  )
}

function RiskCard({ title, level, color, bgColor, borderColor, badge, icon }) {
  return (
    <div className={`border rounded-lg p-5 hover:border-gray-300 transition-colors ${bgColor} ${borderColor}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white rounded-lg">{icon}</div>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
      </div>
      <div className="space-y-3">
        <div className={`text-2xl font-bold ${color}`}>{level}</div>
        {badge && <p className="text-sm font-medium text-gray-700">{badge}</p>}
      </div>
    </div>
  )
}

function RecommendationCard({ option, isSelected, onSelect, isPrimary }) {
  const severityColors = {
    critical: "border-red-200 bg-red-50",
    high: "border-orange-200 bg-orange-50",
    medium: "border-yellow-200 bg-yellow-50",
    low: "border-green-200 bg-green-50",
  }

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>{option.title}</h4>
            {isPrimary && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold">Recommended</span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[option.severity] || "border-gray-200"}`}
            >
              {option.severity?.toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-gray-700 leading-relaxed">{option.description}</p>

          {option.action_steps && option.action_steps.length > 0 && isSelected && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-900 mb-2">Action Steps:</p>
              <ul className="space-y-1">
                {option.action_steps.map((step, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-blue-600 shrink-0 font-bold">•</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}

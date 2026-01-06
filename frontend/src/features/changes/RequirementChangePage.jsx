"use client"

<<<<<<< HEAD
import { useState, useEffect } from "react"
import { useParams } from "react-router-dom"
import { api } from "../../api/axiosClient.js"
import { useQuery } from "@tanstack/react-query"
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
      label: "Very High Risk",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      explanation: "Large scope task introduced mid-sprint. Extremely unlikely to fit within current sprint.",
      badge: "Critical Risk",
    }
  if (p >= 55)
    return {
      level: "High",
      label: "High Risk",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      explanation: "High spillover risk. Scope significantly impacts existing commitments.",
      badge: "High Risk",
=======
// frontend/src/features/changes/RequirementChangePage.jsx
import { useState } from "react"
import { useParams } from "react-router-dom"
import { api } from "../../api/axiosClient.js"
import { AlertCircle, CheckCircle2, Zap, ShieldAlert, BarChart3, Clock, Sparkles } from "lucide-react"

const getScheduleRiskUI = (prob) => {
  const p = prob * 100
  if (p >= 85)
    return {
      level: "Critical",
      label: "Very High Likelihood",
      color: "text-red-500",
      explanation: "Large scope task introduced mid-sprint. Extremely unlikely to finish within current sprint.",
    }
  if (p >= 65)
    return {
      level: "High",
      label: "High Likelihood",
      color: "text-orange-500",
      explanation: "High spillover risk. Scope significantly impacts existing commitments.",
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
    }
  if (p >= 35)
    return {
      level: "Moderate",
<<<<<<< HEAD
      label: "Moderate Risk",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      explanation: "Manageable risk if priority is balanced. May require minor adjustments.",
      badge: "Moderate Risk",
    }
  return {
    level: "Low",
    label: "Low Risk",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    explanation: "Minimal impact on sprint schedule. Fits well within remaining capacity.",
    badge: "Low Risk",
=======
      label: "Medium Likelihood",
      color: "text-amber-500",
      explanation: "Manageable risk if priority is balanced. May require minor adjustments.",
    }
  return {
    level: "Low",
    label: "Low Likelihood",
    color: "text-emerald-500",
    explanation: "Minimal impact on sprint schedule. Fits well within remaining capacity.",
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
  }
}

const getQualityRiskUI = (prob) => {
  const p = prob * 100
<<<<<<< HEAD
  if (p >= 70)
    return {
      level: "High",
      color: "text-red-600",
      bgColor: "bg-red-50",
      interpretation: "High complexity. Allocate extra review and testing time.",
    }
  if (p >= 40)
    return {
      level: "Moderate",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      interpretation: "Moderate complexity. Standard QA processes sufficient.",
    }
  return {
    level: "Low",
    color: "text-green-600",
    bgColor: "bg-green-50",
    interpretation: "Low complexity. Minimal quality risk.",
=======
  if (p >= 75)
    return {
      level: "High",
      color: "text-red-500",
      interpretation: "Risk of defects is high due to complexity. Heavy mitigation required.",
    }
  if (p >= 45)
    return {
      level: "Moderate",
      color: "text-orange-500",
      interpretation: "Moderate risk. Ensure thorough peer review and testing.",
    }
  return {
    level: "Low",
    color: "text-emerald-500",
    interpretation: "Quality risk is currently low. Maintain standard testing procedures.",
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
  }
}

export default function RequirementChangePage() {
  const { spaceId } = useParams()
<<<<<<< HEAD
=======

>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    storyPoints: "1",
    priority: "Medium",
    changeType: "Addition",
  })

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [error, setError] = useState(null)
  const [recommendingSP, setRecommendingSP] = useState(false)
  const [spRecommendation, setSpRecommendation] = useState(null)
<<<<<<< HEAD
  const [activeSprint, setActiveSprint] = useState(null)

  const {
    data: sprints = [],
    isLoading: sprintsLoading,
    error: sprintsError,
  } = useQuery({
    queryKey: ["sprints", spaceId],
    queryFn: async () => {
      const response = await api.get(`/spaces/${spaceId}/sprints`)
      return response.data
    },
    enabled: !!spaceId,
    staleTime: 30000, // 30 seconds
    retry: 2, // Retry failed requests twice
  })

  useEffect(() => {
    if (sprints && sprints.length > 0) {
      const active = sprints.find((s) => s.status === "ACTIVE")
      if (active) {
        setActiveSprint(active._id)
        console.log("[v0] Active sprint set:", active._id)
      } else {
        setActiveSprint(null)
        console.log(
          "[v0] No active sprint found in:",
          sprints.map((s) => ({ name: s.name, status: s.status })),
        )
      }
    }
  }, [sprints])
=======
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (name === "title" || name === "description") {
      setSpRecommendation(null)
    }
  }
<<<<<<< HEAD
=======

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
    setLoading(true)
    setError(null)
    setResult(null)
    setSelectedOption(null) // Reset selected option when re-analyzing
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a

  const getSPRecommendation = async () => {
    if (!formData.title) return
    setRecommendingSP(true)
    try {
<<<<<<< HEAD
      const response = await api.post("/analytics/recommend-sp", {
=======
      // 1. Get Active Sprint
      const sprintsRes = await api.get(`/spaces/${spaceId}/sprints`)
      const activeSprint = sprintsRes.data.find((s) => s.status === "active")

      if (!activeSprint) {
        setError("No active sprint found. Please start a sprint to analyze impact.")
        setLoading(false)
        return
      }

      // 2. Prepare Payload (Matches Backend Expectation)
      const payload = {
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
        title: formData.title,
        description: formData.description,
        type: "Story",
        priority: formData.priority,
<<<<<<< HEAD
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
      setError("No active sprint found. Please create or activate a sprint in the Sprints section.")
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await api.post(`/impact/sprints/${activeSprint}/analyze-impact`, formData)
      setResult(response.data)
      setSelectedOption(null)
    } catch (err) {
      setError(err.response?.data?.error || "Failed to analyze impact. Try again.")
      console.error("Analysis Error:", err)
    } finally {
      setLoading(false)
    }
  }

  const applyDecision = async () => {
    if (!selectedOption || !activeSprint) return
    setApplying(true)
    try {
      await api.post(`/impact/sprints/${activeSprint}/apply-recommendation`, {
        option: selectedOption,
        itemData: formData,
      })
      setResult(null)
=======
        type: "Story",
        mlFeatures: {
          totalLinks: 0,
          totalComments: 0,
        },
      }

      // 3. Call Backend
      const response = await api.post(`/impact/sprints/${activeSprint._id}/analyze-impact`, payload)

      setResult(response.data)
      if (response.data.recommendations?.primary_recommendation) {
        setSelectedOption(response.data.recommendations.primary_recommendation)
      }
    } catch (err) {
      console.error("Analysis Error:", err)
      setError(err.response?.data?.error || "Failed to analyze impact")
    } finally {
      setLoading(false)
    }
  }

  const applyDecision = async () => {
    if (!selectedOption) {
      setError("Please select a recommendation option")
      return
    }

    setApplying(true)
    setError(null)

    try {
      const sprintsRes = await api.get(`/spaces/${spaceId}/sprints`)
      const activeSprint = sprintsRes.data.find((s) => s.status === "active")

      if (!activeSprint) {
        setError("No active sprint found")
        setApplying(false)
        return
      }

      const payload = {
        option: selectedOption,
        itemData: {
          title: formData.title,
          description: formData.description,
          storyPoints: Number(formData.storyPoints),
          priority: formData.priority,
          type: "Story",
        },
      }

      const response = await api.post(`/impact/sprints/${activeSprint._id}/apply-recommendation`, payload)

      // Show success message
      alert(`Success: ${response.data.message}`)

      // Reset form
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
      setFormData({
        title: "",
        description: "",
        storyPoints: "1",
        priority: "Medium",
        changeType: "Addition",
      })
<<<<<<< HEAD
      setSelectedOption(null)
    } catch (err) {
      setError("Failed to apply recommendation.")
      console.error("Apply Error:", err)
=======
      setResult(null)
      setSelectedOption(null)
    } catch (err) {
      console.error("Apply Decision Error:", err)
      setError(err.response?.data?.error || "Failed to apply decision")
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
    } finally {
      setApplying(false)
    }
  }

  return (
<<<<<<< HEAD
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
                <p className="text-xs text-green-600 font-medium">Active Sprint Ready</p>
              ) : (
                <p className="text-xs text-amber-600 font-medium">No active sprint. Create one to proceed.</p>
              )}
            </div>

            <form onSubmit={analyzeImpact} className="space-y-5 bg-white border border-gray-200 p-6 rounded-lg">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Title</label>
                <input
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="e.g., Add Face ID Login"
                  required
                />
=======
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT: INPUT FORM */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Requirement</h1>
            <p className="text-slate-500">Analyze the impact of a mid-sprint change.</p>
          </div>

          <form
            onSubmit={analyzeImpact}
            className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Add Face ID Login"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Technical details..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Story Points</label>
                <div className="flex gap-2">
                  <input
                    name="storyPoints"
                    type="number"
                    value={formData.storyPoints}
                    onChange={handleChange}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                    required
                  />
                  <button
                    type="button"
                    onClick={getSPRecommendation}
                    disabled={recommendingSP || !formData.title}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center justify-center shrink-0"
                    title="Get AI Recommendation"
                  >
                    {recommendingSP ? (
                      <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </button>
                </div>
                {spRecommendation && (
                  <p className="text-[10px] text-blue-600 mt-1 animate-in fade-in slide-in-from-top-1">
                    AI Suggests: {spRecommendation.recommended_story_point} SP
                  </p>
                )}
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 placeholder:text-gray-400"
                  placeholder="Technical details, dependencies, scope..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Story Points</label>
                  <div className="flex gap-2">
                    <input
                      name="storyPoints"
                      type="number"
                      value={formData.storyPoints}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                      required
                    />
                    <button
                      type="button"
                      onClick={getSPRecommendation}
                      disabled={recommendingSP || !formData.title}
                      className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Get AI Recommendation"
                    >
                      {recommendingSP ? (
                        <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
                      ) : (
                        <Sparkles size={18} />
                      )}
                    </button>
                  </div>
                  {spRecommendation && (
                    <p className="text-xs text-blue-600 mt-1.5 font-medium">
                      AI suggests: {spRecommendation.recommended_story_point} SP
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Priority</label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                  >
                    <option>Lowest</option>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Highest</option>
                    <option>Critical</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
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
                <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
<<<<<<< HEAD
            </form>
          </div>

          {/* RIGHT: RESULTS DASHBOARD */}
          <div className="lg:col-span-2">
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* HEADER */}
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
                    subValue="Quantile Regression"
                    icon={<Clock className="text-blue-600" size={24} />}
                    model={result.models_status?.effort}
                  />

                  <RiskCard
                    title="Schedule Risk"
                    {...getScheduleRiskUI(result.schedule_risk.probability)}
                    icon={<TrendingUp className="text-blue-600" size={24} />}
                    model={result.models_status?.schedule}
                  />

                  <MetricCard
                    title="Productivity Delay"
                    value={result.productivity_impact.days}
                    subValue={`Drop: ${result.productivity_impact.drop}`}
                    icon={<AlertTriangle className="text-amber-600" size={24} />}
                    model={result.models_status?.productivity}
                  />

                  <RiskCard
                    title="Quality Risk"
                    {...getQualityRiskUI(result.quality_risk.probability)}
                    icon={<ShieldAlert className="text-red-600" size={24} />}
                    model={result.models_status?.quality}
                    isQuality
                  />
                </div>

                {/* RECOMMENDATIONS */}
                {result.recommendations && (
                  <div className="space-y-5">
                    {/* Risk Summary */}
                    <div
                      className={`p-5 rounded-lg border-2 ${getScheduleRiskUI(result.schedule_risk.probability).borderColor} ${getScheduleRiskUI(result.schedule_risk.probability).bgColor}`}
                    >
                      <div className="flex items-start gap-3">
                        <ShieldAlert
                          size={20}
                          className={`shrink-0 ${getScheduleRiskUI(result.schedule_risk.probability).color}`}
                        />
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900">
                            {getScheduleRiskUI(result.schedule_risk.probability).badge}
                          </h3>
                          <p className="text-sm text-gray-700 mt-1">
                            {result.recommendations.reasoning ||
                              getScheduleRiskUI(result.schedule_risk.probability).explanation}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center gap-2 mb-5">
                        <CheckCircle2 size={20} className="text-blue-600" />
                        <h3 className="font-bold text-gray-900">Recommended Actions</h3>
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
                            ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
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
                            Apply Recommendation
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
=======
            </button>
          </form>

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-3 border border-red-100">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* RIGHT: RESULTS DASHBOARD */}
        <div className="w-full lg:w-2/3">
          {result ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Impact Analysis</h2>
                <span className="text-xs font-mono text-slate-400">
                  ML-SERVICE: {result.models_status.effort ? "ONLINE" : "OFFLINE"}
                </span>
              </div>

              {/* GRID OF CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. EFFORT ESTIMATE */}
                <MetricCard
                  title="AI Effort Estimate"
                  value={`${result.predicted_hours} hrs`}
                  subValue="Calculated via Quantile Regression"
                  icon={<Clock className="text-blue-400" size={24} />}
                  status="neutral"
                  model={result.models_status?.effort ? "AI" : "Rule"}
                />

                {/* 2. SCHEDULE RISK */}
                <RiskCard
                  title="Schedule Risk"
                  {...getScheduleRiskUI(result.schedule_risk.probability)}
                  icon={<BarChart3 className="text-amber-400" size={24} />}
                  model={result.models_status?.schedule ? "AI" : "Rule"}
                  type="schedule"
                />

                {/* 3. PRODUCTIVITY IMPACT */}
                <MetricCard
                  title="Productivity Delay"
                  value={result.productivity_impact.days}
                  subValue={`Efficiency Drop: ${result.productivity_impact.drop}`}
                  icon={<Zap className="text-purple-400" size={24} />}
                  status={result.productivity_impact.days.startsWith("-") ? "Good" : "Warning"}
                  model={result.models_status?.productivity ? "AI" : "Rule"}
                />

                {/* 4. DEFECT RISK */}
                <RiskCard
                  title="Defect Risk"
                  {...getQualityRiskUI(result.quality_risk.probability)}
                  icon={<ShieldAlert className="text-red-400" size={24} />}
                  model={result.models_status?.quality ? "AI" : "Rule"}
                  type="quality"
                />
              </div>

              {result.recommendations && (
                <div className="space-y-4">
                  {/* Risk Summary */}
                  <div
                    className={`p-4 rounded-xl border-2 ${getRiskBorderColor(result.recommendations.risk_summary?.level)}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getRiskBgColor(result.recommendations.risk_summary?.level)}`}>
                        <ShieldAlert
                          size={20}
                          className={getRiskTextColor(result.recommendations.risk_summary?.level)}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">
                            {result.recommendations.risk_summary?.level || "UNKNOWN"} RISK
                          </h3>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                            Rule-Based Assessment
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{result.recommendations.risk_summary?.summary}</p>
                      </div>
                    </div>
                  </div>

                  {/* Decision Section */}
                  <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 size={20} className="text-blue-600" />
                      <h3 className="font-bold text-slate-900">Recommended Actions</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        Select One
                      </span>
                    </div>

                    <div className="space-y-3">
                      {/* Primary Recommendation */}
                      {result.recommendations.primary_recommendation && (
                        <RecommendationCard
                          option={result.recommendations.primary_recommendation}
                          isSelected={selectedOption?.id === result.recommendations.primary_recommendation.id}
                          onSelect={() => setSelectedOption(result.recommendations.primary_recommendation)}
                          isPrimary={true}
                        />
                      )}

                      {/* Alternative Options */}
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

                    {/* Apply Button */}
                    <button
                      onClick={applyDecision}
                      disabled={!selectedOption || applying}
                      className={`w-full mt-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                        selectedOption && !applying
                          ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30"
                          : "bg-slate-200 text-slate-400 cursor-not-allowed"
                      }`}
                    >
                      {applying ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Applying Decision...
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
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 min-h-[400px]">
              <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                <BarChart3 size={32} className="text-slate-300" />
              </div>
              <p>Fill out the form to generate AI predictions</p>
            </div>
          )}
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
        </div>
      </div>
    </div>
  )
}

<<<<<<< HEAD
function MetricCard({ title, value, subValue, icon, model }) {
  const isAI = model && typeof model === "string" && model.includes("true")
=======
function RiskCard({ title, level, label, color, explanation, interpretation, icon, model, type }) {
  const isAI = model && typeof model === "string" && model.includes("AI")
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
<<<<<<< HEAD
          <div className="p-2 bg-blue-50 rounded-lg">{icon}</div>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <p className="text-xs text-gray-500">{subValue}</p>
=======
          <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-colors">{icon}</div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${isAI ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-slate-800 border-slate-700 text-slate-500"}`}
        >
          {isAI ? "🤖 ML" : "📐 Rule"}
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <div className={`text-2xl font-bold ${color}`}>
            {level} {type === "schedule" ? "Risk" : ""}
          </div>
          {label && <p className="text-sm font-medium text-slate-300">{label}</p>}
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-2">
          {type === "schedule" ? (
            <>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-tight">Why this is risky:</p>
              <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                <li>Scope introduced mid-sprint</li>
                <li>Impacts existing velocity</li>
              </ul>
              <p className="text-[11px] text-slate-500 italic mt-2 border-l-2 border-slate-700 pl-2">{explanation}</p>
            </>
          ) : (
            <>
              <p className="text-[11px] text-slate-400">{interpretation}</p>
              <p className="text-[10px] text-slate-500 italic">
                Caution: Risk may increase if scope expands or implementation is rushed.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, subValue, icon, status, model }) {
  // Safe check for includes to prevent crash
  const isAI = model && typeof model === "string" && model.includes("AI")

  return (
    <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-colors">{icon}</div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        </div>

        {/* BADGE */}
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            isAI ? "bg-blue-500/10 border-blue-500/20 text-blue-400" : "bg-slate-800 border-slate-700 text-slate-500"
          }`}
        >
          {isAI ? "🤖 ML" : "📐 Rule"}
        </span>
      </div>

      <div className="space-y-1">
        <div className={`text-2xl font-bold ${getStatusColor(status)}`}>{value}</div>
        <p className="text-xs text-slate-500">{subValue}</p>
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
      </div>
    </div>
  )
}

<<<<<<< HEAD
function RiskCard({ title, level, label, color, bgColor, explanation, interpretation, icon, model, isQuality }) {
  return (
    <div className={`border border-gray-200 rounded-lg p-5 hover:border-gray-300 transition-colors ${bgColor}`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg">{icon}</div>
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className={`text-2xl font-bold ${color}`}>{level}</div>
          {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
        </div>

        <p className="text-sm text-gray-700 border-t border-gray-200 pt-3">
          {isQuality ? interpretation : explanation}
        </p>
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

  const severityTextColors = {
    critical: "text-red-700",
    high: "text-orange-700",
    medium: "text-yellow-700",
    low: "text-green-700",
  }
=======
// Logic for colors
function getStatusColor(status) {
  if (!status) return "text-slate-200"
  const s = status.toLowerCase()
  if (s.includes("critical") || s.includes("high") || s.includes("warning")) return "text-red-400"
  if (s.includes("medium") || s.includes("moderate")) return "text-amber-400"
  return "text-slate-200" // Default/Good
}

// Simple logic to generate text
function getRecommendation(result) {
  if (result.schedule_risk.label.includes("Critical")) {
    return "⛔ CRITICAL RISK: This item has a very high chance of causing a sprint spillover. The AI detected high developer workload and insufficient time remaining. Recommend moving to next sprint or splitting the story."
  }
  if (result.quality_risk.label === "High") {
    return "⚠️ QUALITY WARNING: The complexity and developer load suggest a high risk of bugs. Ensure extra code review time and automated tests are allocated."
  }
  if (result.predicted_hours > 20) {
    return "ℹ️ SIZE ALERT: This ticket is estimated to be larger than a typical story. Consider breaking it down into smaller subtasks to maintain flow."
  }
  return "✅ LOW RISK: This item fits well within the current sprint constraints. Proceed with assignment."
}

function RecommendationCard({ option, isSelected, onSelect, isPrimary }) {
  const severityColors = {
    critical: "border-red-500 bg-red-50",
    high: "border-orange-500 bg-orange-50",
    medium: "border-yellow-500 bg-yellow-50",
    low: "border-green-500 bg-green-50",
  }

  const severityTextColors = {
    critical: "text-red-700",
    high: "text-orange-700",
    medium: "text-yellow-700",
    low: "text-green-700",
  }
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
<<<<<<< HEAD
        isSelected ? "border-blue-500 bg-blue-50 shadow-md" : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            isSelected ? "border-blue-600 bg-blue-600" : "border-gray-300"
=======
        isSelected ? "border-blue-600 bg-blue-50 shadow-lg" : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Radio Button */}
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
            isSelected ? "border-blue-600 bg-blue-600" : "border-slate-300"
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
          }`}
        >
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
<<<<<<< HEAD
            <h4 className={`font-bold ${isSelected ? "text-blue-900" : "text-gray-900"}`}>{option.title}</h4>
            {isPrimary && (
              <span className="text-xs px-2 py-1 rounded-full bg-blue-600 text-white font-semibold">Recommended</span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[option.severity] || "border-gray-200"} ${severityTextColors[option.severity] || "text-gray-600"}`}
=======
            <h4 className={`font-bold ${isSelected ? "text-blue-900" : "text-slate-900"}`}>{option.title}</h4>
            {isPrimary && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white font-semibold">Recommended</span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${severityColors[option.severity] || "border-slate-200"} ${severityTextColors[option.severity] || "text-slate-600"}`}
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
            >
              {option.severity?.toUpperCase()}
            </span>
          </div>

<<<<<<< HEAD
          <p className="text-sm text-gray-700 leading-relaxed">{option.description}</p>

          {option.action_steps && option.action_steps.length > 0 && isSelected && (
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
              <p className="text-xs font-semibold text-gray-900 mb-2">Action Steps:</p>
              <ul className="space-y-1">
                {option.action_steps.map((step, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-2">
                    <span className="text-blue-600 shrink-0 font-bold">•</span>
=======
          <p className="text-sm text-slate-600 leading-relaxed">{option.description}</p>

          {/* Impact Metrics */}
          {option.impact && (
            <div className="flex flex-wrap gap-3 pt-2">
              <div className="text-xs">
                <span className="text-slate-500">Schedule Risk:</span>{" "}
                <span className="font-semibold text-slate-700">{option.impact.schedule_risk}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">Productivity:</span>{" "}
                <span className="font-semibold text-slate-700">{option.impact.productivity_impact}</span>
              </div>
              <div className="text-xs">
                <span className="text-slate-500">Quality Risk:</span>{" "}
                <span className="font-semibold text-slate-700">{option.impact.quality_risk}</span>
              </div>
            </div>
          )}

          {/* Action Steps */}
          {option.action_steps && option.action_steps.length > 0 && isSelected && (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-700 mb-2">Action Steps:</p>
              <ul className="space-y-1">
                {option.action_steps.map((step, idx) => (
                  <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
                    <span className="text-blue-600 shrink-0">•</span>
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a
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
<<<<<<< HEAD
=======

function ImpactBadge({ label, value }) {
  return (
    <div className="bg-white border border-slate-100 p-2 rounded-lg flex flex-col items-center">
      <span className="text-[9px] text-slate-400 uppercase font-bold">{label}</span>
      <span className="text-xs font-bold text-slate-700">{value}</span>
    </div>
  )
}

function getRiskBorderColor(level) {
  switch (level) {
    case "CRITICAL":
      return "border-red-500 bg-red-50"
    case "HIGH":
      return "border-orange-500 bg-orange-50"
    case "MEDIUM":
      return "border-yellow-500 bg-yellow-50"
    case "LOW":
      return "border-green-500 bg-green-50"
    default:
      return "border-slate-300 bg-slate-50"
  }
}

function getRiskBgColor(level) {
  switch (level) {
    case "CRITICAL":
      return "bg-red-100"
    case "HIGH":
      return "bg-orange-100"
    case "MEDIUM":
      return "bg-yellow-100"
    case "LOW":
      return "bg-green-100"
    default:
      return "bg-slate-100"
  }
}

function getRiskTextColor(level) {
  switch (level) {
    case "CRITICAL":
      return "text-red-600"
    case "HIGH":
      return "text-orange-600"
    case "MEDIUM":
      return "text-yellow-600"
    case "LOW":
      return "text-green-600"
    default:
      return "text-slate-600"
  }
}
>>>>>>> 331fde8aafb86603570aed680dd22ebe4747557a

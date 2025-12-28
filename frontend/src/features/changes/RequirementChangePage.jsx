"use client"

import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api } from "../../api/axiosClient.js"
import { ImpactApi } from "../../api/impactApi.js"
import { AlertCircle, CheckCircle2, Zap, ShieldAlert, BarChart3, Clock } from "lucide-react"

export default function RequirementChangePage() {
  const { spaceId } = useParams()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    changeType: "Addition",
    title: "",
    description: "",
    storyPoints: "",
    priority: "Medium",
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const analyzeImpact = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const sprintsRes = await api.get(`/spaces/${spaceId}/sprints`)
      const activeSprint = sprintsRes.data.find((s) => s.status === "active")

      if (!activeSprint) {
        setError("No active sprint found. Please start a sprint first.")
        setLoading(false)
        return
      }

      const sprintStart = new Date(activeSprint.startDate)
      const now = new Date()
      const daysIntoSprint = Math.floor((now - sprintStart) / (1000 * 60 * 60 * 24))

      const analysisData = {
        title: formData.title,
        description: formData.description,
        storyPoints: Number.parseInt(formData.storyPoints) || 0,
        priority: formData.priority,
        changeType: formData.changeType,
        days_since_start: daysIntoSprint,
        sprint_capacity: 80,
        sprint_committed_sp: activeSprint.metrics?.committedSP || 0,
      }

      console.log("[Frontend] Sending analysis request:", analysisData)
      const response = await ImpactApi.analyzeMidSprintImpact(activeSprint._id, analysisData)

      const safeResult = {
        ...response.data,
        reasons: response.data.reasons || [],
        effort: response.data.effort || {},
        schedule_risk: {
          ...response.data.schedule_risk,
          factors: response.data.schedule_risk?.factors || [],
        },
        quality_risk: {
          ...response.data.quality_risk,
          factors: response.data.quality_risk?.factors || [],
        },
        productivity_impact: response.data.productivity_impact || {},
        models_status: response.data.models_status || {},
      }

      setResult(safeResult)

      await api.post(`/spaces/${spaceId}/changes`, {
        type: formData.changeType,
        fieldsChanged: ["title", "description", "SP", "priority"],
        diffs: [
          { field: "title", old: null, new: formData.title },
          { field: "description", old: null, new: formData.description },
          { field: "SP", old: 0, new: Number.parseInt(formData.storyPoints) || 0 },
          { field: "priority", old: null, new: formData.priority },
        ],
        sprint: activeSprint._id,
        requirementDetails: {
          title: formData.title,
          description: formData.description,
          storyPoints: Number.parseInt(formData.storyPoints) || 0,
          priority: formData.priority,
        },
        daysIntoSprint: daysIntoSprint,
        currentLoad: activeSprint.metrics?.committedSP || 0,
        mlImpact: {
          effortImpact: safeResult.effort.predicted_hours || 0,
          scheduleRisk: safeResult.schedule_risk.probability || 0,
          qualityRisk: safeResult.quality_risk.probability || 0,
          productivityChange: safeResult.productivity_impact.impact_percentage || 0,
        },
      })

      console.log("[Frontend] Analysis complete and saved")
    } catch (err) {
      console.error("Failed to analyze impact:", err)
      setError(err.response?.data?.error || err.message || "Failed to analyze impact")
    } finally {
      setLoading(false)
    }
  }

  const getDecisionColor = (decision) => {
    if (!decision) return "bg-gray-50 border-gray-300 text-gray-900"
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

  const getModelBadge = (modelUsed) => {
    const isMLModel = modelUsed && !modelUsed.includes("Rule-based")
    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-medium ${
          isMLModel ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"
        }`}
      >
        {isMLModel ? "🤖 ML Model" : "📐 Rule-based"}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Requirement Tracker</h1>
            <p className="text-slate-500 mt-1">Analyze mid-sprint requirement disruptions with ML impact prediction</p>
          </div>
          {/* ... existing header controls ... */}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-1 space-y-6">
            <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-500" />
                Change Details
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 uppercase">Change Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Addition", "Update", "Removal"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setFormData({ ...formData, changeType: t })}
                        className={`py-2 px-3 rounded-lg text-xs font-medium transition-all border ${
                          formData.changeType === t
                            ? "bg-blue-600/10 border-blue-500 text-blue-400"
                            : "bg-[#111] border-slate-800 text-slate-500 hover:border-slate-700"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                {/* ... existing form fields with dark theme styling ... */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#111] text-white"
                    placeholder="e.g., Add Face Recognition Login"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    required
                    rows={4}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#111] text-white"
                    placeholder="Integrate AWS Rekognition API to allow users to log in using their face. Must work on iOS and Android. High security required."
                  />
                  <p className="text-xs text-slate-500 mt-1">💡 Detailed descriptions improve ML prediction accuracy</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Story Points <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="storyPoints"
                      value={formData.storyPoints}
                      onChange={handleChange}
                      required
                      min="0"
                      max="100"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#111] text-white"
                      placeholder="e.g., 10"
                    />
                    <p className="text-xs text-slate-500 mt-1">Team-voted estimate</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Priority <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-[#111] text-white"
                    >
                      <option value="Lowest">Lowest</option>
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Highest">Highest (Critical)</option>
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 font-medium">Error</p>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  onClick={analyzeImpact}
                  disabled={loading}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Analyzing Impact...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                        />
                      </svg>
                      Analyze Impact
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          <section className="lg:col-span-2 space-y-6">
            {result ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div
                  className={`p-6 rounded-xl border flex items-center gap-4 ${
                    result.decision.includes("SAFE")
                      ? "bg-green-500/5 border-green-500/20 text-green-400"
                      : "bg-red-500/5 border-red-500/20 text-red-400"
                  }`}
                >
                  {result.decision.includes("SAFE") ? (
                    <CheckCircle2 className="w-8 h-8" />
                  ) : (
                    <ShieldAlert className="w-8 h-8" />
                  )}
                  <div>
                    <h2 className="text-xl font-bold">{result.decision}</h2>
                    <p className="text-sm opacity-80">{result.reasons[0]}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    title="Predicted Effort"
                    value={`${result.effort.predicted_hours}h`}
                    icon={<Clock className="w-4 h-4 text-blue-500" />}
                    status={result.effort.status}
                    model={result.effort.model_used}
                  />
                  <MetricCard
                    title="Schedule Risk"
                    value={`${(result.schedule_risk.probability * 100).toFixed(0)}%`}
                    icon={<BarChart3 className="w-4 h-4 text-purple-500" />}
                    status={result.schedule_risk.risk_level}
                    model={result.schedule_risk.model_used}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <MetricCard
                    title="Quality Risk"
                    value={`${(result.quality_risk.probability * 100).toFixed(0)}%`}
                    icon={<AlertCircle className="w-4 h-4 text-red-500" />}
                    status={result.quality_risk.risk_level}
                    model={result.quality_risk.model_used}
                  />
                  <MetricCard
                    title="Productivity Impact"
                    value={`${(result.productivity_impact.impact_percentage || 0).toFixed(1)}%`}
                    icon={<ShieldAlert className="w-4 h-4 text-orange-500" />}
                    status={result.productivity_impact.status}
                    model={result.productivity_impact.model_used}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-6 shadow-2xl flex items-center justify-center">
                <p className="text-sm text-slate-500">No analysis results available yet.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ title, value, icon, status, model }) {
  return (
    <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-slate-900 rounded-lg">{icon}</div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${
            model.includes("AI")
              ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
              : "bg-slate-800 border-slate-700 text-slate-500"
          }`}
        >
          {model.includes("AI") ? "🤖 ML" : "📐 Rule"}
        </span>
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className={`text-xs font-medium ${status === "High" ? "text-red-500" : "text-green-500"}`}>
        {status} Intensity Impact
      </div>
    </div>
  )
}

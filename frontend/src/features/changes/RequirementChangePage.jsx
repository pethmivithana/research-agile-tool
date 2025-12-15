"use client"

import { useState } from "react"
import { api } from "../../api/axiosClient.js"
import { useNavigate } from "react-router-dom"

export default function RequirementChangePage() {
  const navigate = useNavigate()
  const [payload, setPayload] = useState({
    type: "Update",
    workItemId: "",
    fieldsChanged: [],
    diffs: [],
    description: "",
  })
  const [impacts, setImpacts] = useState(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Save change event
      const changeRes = await api.post("/changes", payload)
      // Call ML stub for prediction
      const { data } = await api.post("/ml/predict-impact", { change: changeRes.data })
      setImpacts(data.impacts)
    } catch (error) {
      console.error("Failed to submit change:", error)
      alert("Failed to submit requirement change")
    } finally {
      setLoading(false)
    }
  }

  const getChangeTypeColor = (type) => {
    if (type === "Addition") return "bg-green-50 border-green-200 text-green-900"
    if (type === "Removal") return "bg-red-50 border-red-200 text-red-900"
    return "bg-blue-50 border-blue-200 text-blue-900"
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Requirement Change Tracker</h2>
        <p className="text-slate-600 mt-1">Track and analyze the impact of requirement changes</p>
      </div>

      {/* Change Form */}
      <form onSubmit={submit} className="card space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Log Requirement Change</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Change Type *</label>
            <select
              className="select"
              value={payload.type}
              onChange={(e) => setPayload((p) => ({ ...p, type: e.target.value }))}
              required
            >
              <option>Addition</option>
              <option>Update</option>
              <option>Removal</option>
            </select>
          </div>
          <div>
            <label className="label">Work Item ID *</label>
            <input
              className="input"
              placeholder="e.g., TASK-123"
              value={payload.workItemId}
              onChange={(e) => setPayload((p) => ({ ...p, workItemId: e.target.value }))}
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Description of Change *</label>
          <textarea
            className="textarea"
            placeholder="Describe what changed and why..."
            value={payload.description}
            onChange={(e) => setPayload((p) => ({ ...p, description: e.target.value }))}
            required
            rows={4}
          />
        </div>

        <div className={`p-4 rounded-lg border ${getChangeTypeColor(payload.type)}`}>
          <h4 className="font-semibold mb-2">Change Impact Preview</h4>
          <p className="text-sm">
            This {payload.type.toLowerCase()} will be analyzed for its potential impact on effort, schedule, quality,
            and team productivity.
          </p>
        </div>

        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Analyzing impact..." : "Submit & Analyze Change"}
        </button>
      </form>

      {/* Impact Results */}
      {impacts && (
        <div className="space-y-4 animate-in slide-in-from-bottom">
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Predicted Impact Analysis</h3>
                <p className="text-sm text-slate-600">ML-powered predictions based on historical data</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <ImpactMetric
                label="Effort Impact"
                value={impacts.effortImpact}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                }
              />
              <ImpactMetric
                label="Schedule Risk"
                value={impacts.scheduleRisk}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                }
              />
              <ImpactMetric
                label="Quality Risk"
                value={impacts.qualityRisk}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                }
              />
              <ImpactMetric
                label="Productivity Change"
                value={impacts.productivityChange}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                    />
                  </svg>
                }
              />
            </div>
          </div>

          <Recommendations impacts={impacts} />
        </div>
      )}
    </div>
  )
}

function ImpactMetric({ label, value, icon }) {
  const percentage = (value * 100).toFixed(0)
  const getColor = () => {
    if (value < 0.3) return "text-green-600 bg-green-50"
    if (value < 0.6) return "text-yellow-600 bg-yellow-50"
    return "text-red-600 bg-red-50"
  }

  return (
    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-2">
        <div className={`${getColor()} p-1.5 rounded`}>{icon}</div>
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
      <div className={`text-3xl font-bold ${getColor().split(" ")[0]}`}>{percentage}%</div>
      <div className="mt-2 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${getColor().split(" ")[1].replace("bg-", "bg-").replace("50", "400")} transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function Recommendations({ impacts }) {
  const [recs, setRecs] = useState(null)
  const [loading, setLoading] = useState(false)

  const getRecs = async () => {
    setLoading(true)
    try {
      const { data } = await api.post("/ml/get-recommendations", { impacts })
      setRecs(data)
    } catch (error) {
      console.error("Failed to get recommendations:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-900 mb-3">AI-Powered Recommendations</h3>

      {!recs ? (
        <button className="btn btn-primary" onClick={getRecs} disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              Generate Recommendations
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          {recs.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <p className="text-sm text-blue-900 flex-1">{r}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

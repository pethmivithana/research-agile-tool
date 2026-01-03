// frontend/src/features/changes/RequirementChangePage.jsx
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../api/axiosClient.js";
import { AlertCircle, CheckCircle2, Zap, ShieldAlert, BarChart3, Clock } from "lucide-react";

export default function RequirementChangePage() {
  const { spaceId } = useParams();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    storyPoints: "1",
    priority: "Medium",
    changeType: "Addition" // Added for context
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const analyzeImpact = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // 1. Get Active Sprint
      const sprintsRes = await api.get(`/spaces/${spaceId}/sprints`);
      const activeSprint = sprintsRes.data.find((s) => s.status === "active");

      if (!activeSprint) {
        setError("No active sprint found. Please start a sprint to analyze impact.");
        setLoading(false);
        return;
      }

      // 2. Prepare Payload (Matches Backend Expectation)
      // Note: We map formData to the structure expected by impact.controller.js
      const payload = {
        title: formData.title,
        description: formData.description,
        storyPoints: Number(formData.storyPoints),
        priority: formData.priority,
        type: "Story", // Defaulting to story for analysis
        
        // Mocking 'mlFeatures' for the controller to read
        // In a real app, you might fetch dev history here
        mlFeatures: {
            totalLinks: 0,
            totalComments: 0
        }
      };

      // 3. Call Backend
      const response = await api.post(
        `/impact/sprints/${activeSprint._id}/analyze-impact`,
        payload
      );

      setResult(response.data);
    } catch (err) {
      console.error("Analysis Error:", err);
      setError(err.response?.data?.error || "Failed to analyze impact");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* LEFT: INPUT FORM */}
        <div className="w-full lg:w-1/3 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">New Requirement</h1>
            <p className="text-slate-500">Analyze the impact of a mid-sprint change.</p>
          </div>

          <form onSubmit={analyzeImpact} className="space-y-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Story Points</label>
                <input
                  name="storyPoints"
                  type="number"
                  value={formData.storyPoints}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full p-2 border border-slate-300 rounded-lg"
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
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex justify-center items-center gap-2"
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
                <h2 className="text-xl font-bold text-slate-900">Analysis Results</h2>
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
                  // Mapping boolean status to "AI" or "Rule" string safely
                  model={result.models_status?.effort ? "AI" : "Rule"} 
                />

                {/* 2. SCHEDULE RISK */}
                <MetricCard
                  title="Schedule Risk"
                  value={result.schedule_risk.label}
                  subValue={`Probability: ${result.schedule_risk.probability}`}
                  icon={<BarChart3 className="text-amber-400" size={24} />}
                  status={result.schedule_risk.label}
                  model={result.models_status?.schedule ? "AI" : "Rule"}
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

                {/* 4. QUALITY RISK */}
                <MetricCard
                  title="Defect Risk"
                  value={result.quality_risk.label}
                  subValue={`Probability: ${result.quality_risk.probability}`}
                  icon={<ShieldAlert className="text-red-400" size={24} />}
                  status={result.quality_risk.label}
                  model={result.models_status?.quality ? "AI" : "Rule"}
                />
              </div>

              {/* Recommendation Box */}
              <div className="bg-slate-900 text-slate-200 p-6 rounded-xl border border-slate-800">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-green-400" />
                  AI Recommendation
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {getRecommendation(result)}
                </p>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 min-h-[400px]">
              <div className="p-4 bg-white rounded-full mb-4 shadow-sm">
                <BarChart3 size={32} className="text-slate-300" />
              </div>
              <p>Fill out the form to generate AI predictions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to safely render the cards
function MetricCard({ title, value, subValue, icon, status, model }) {
  // Safe check for includes to prevent crash
  const isAI = model && typeof model === 'string' && model.includes("AI");

  return (
    <div className="bg-[#0A0A0A] border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-slate-800 transition-colors">
            {icon}
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {title}
          </span>
        </div>
        
        {/* BADGE */}
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
          isAI 
            ? "bg-blue-500/10 border-blue-500/20 text-blue-400" 
            : "bg-slate-800 border-slate-700 text-slate-500"
        }`}>
          {isAI ? "🤖 ML" : "📐 Rule"}
        </span>
      </div>
      
      <div className="space-y-1">
        <div className={`text-2xl font-bold ${getStatusColor(status)}`}>
          {value}
        </div>
        <p className="text-xs text-slate-500">{subValue}</p>
      </div>
    </div>
  );
}

// Logic for colors
function getStatusColor(status) {
  if (!status) return "text-slate-200";
  const s = status.toLowerCase();
  if (s.includes("critical") || s.includes("high") || s.includes("warning")) return "text-red-400";
  if (s.includes("medium") || s.includes("moderate")) return "text-amber-400";
  return "text-slate-200"; // Default/Good
}

// Simple logic to generate text
function getRecommendation(result) {
  if (result.schedule_risk.label.includes("Critical")) {
    return "⛔ CRITICAL RISK: This item has a very high chance of causing a sprint spillover. The AI detected high developer workload and insufficient time remaining. Recommend moving to next sprint or splitting the story.";
  }
  if (result.quality_risk.label === "High") {
    return "⚠️ QUALITY WARNING: The complexity and developer load suggest a high risk of bugs. Ensure extra code review time and automated tests are allocated.";
  }
  if (result.predicted_hours > 20) {
    return "ℹ️ SIZE ALERT: This ticket is estimated to be larger than a typical story. Consider breaking it down into smaller subtasks to maintain flow.";
  }
  return "✅ LOW RISK: This item fits well within the current sprint constraints. Proceed with assignment.";
}
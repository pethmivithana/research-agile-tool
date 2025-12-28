const ImpactCard = ({ title, value, subValue, status, modelUsed }) => {
  const getStatusColor = (s) => {
    if (!s) return "text-slate-600"
    const lower = s.toLowerCase()
    if (lower.includes("high") || lower.includes("critical") || lower.includes("drop")) return "text-red-600"
    if (lower.includes("medium") || lower.includes("moderate")) return "text-amber-600"
    return "text-green-600"
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h4>
        {modelUsed && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              modelUsed.includes("Rule")
                ? "bg-slate-100 text-slate-600"
                : "bg-blue-50 text-blue-600 border border-blue-100"
            }`}
          >
            {modelUsed.includes("Rule") ? "📐 Rule" : "🤖 AI"}
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${getStatusColor(status)}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{subValue}</div>
    </div>
  )
}

export default ImpactCard

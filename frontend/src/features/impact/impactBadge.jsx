export default function ImpactBadge({ analysis }) {
  if (!analysis) return null

  const { complexityBadge, effortEstimate, qualityRisk } = analysis

  const getBadgeColor = (badge) => {
    if (!badge) return "bg-slate-100 text-slate-600 border-slate-300"
    if (badge.includes("🔴")) return "bg-red-100 text-red-700 border-red-300"
    if (badge.includes("🟠")) return "bg-orange-100 text-orange-700 border-orange-300"
    return "bg-green-100 text-green-700 border-green-300"
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`px-2 py-1 rounded-full border font-medium ${getBadgeColor(complexityBadge)}`}>
        {complexityBadge}
      </span>
      {effortEstimate && (
        <span className="text-slate-600" title="Estimated effort">
          ⏱ {effortEstimate}h
        </span>
      )}
      {qualityRisk !== undefined && (
        <span
          className={`${qualityRisk > 0.7 ? "text-red-600" : qualityRisk > 0.4 ? "text-orange-600" : "text-green-600"}`}
          title="Quality risk probability"
        >
          🐛 {(qualityRisk * 100).toFixed(0)}%
        </span>
      )}
    </div>
  )
}

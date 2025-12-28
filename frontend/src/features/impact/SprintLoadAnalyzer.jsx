"use client"

import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { ImpactApi } from "../../api/impactApi.js"

export default function SprintLoadAnalyzer({ sprintId, workItemIds, onAnalysisComplete }) {
  const [results, setResults] = useState(null)
  const [isOpen, setIsOpen] = useState(false)

  const batchAnalyzeMutation = useMutation({
    mutationFn: () => ImpactApi.batchAnalyze(sprintId, workItemIds),
    onSuccess: (response) => {
      setResults(response.data.analyses)
      if (onAnalysisComplete) {
        onAnalysisComplete(response.data.analyses)
      }
    },
  })

  const handleAnalyze = () => {
    setIsOpen(true)
    batchAnalyzeMutation.mutate()
  }

  if (!isOpen) {
    return (
      <button onClick={handleAnalyze} disabled={workItemIds.length === 0} className="btn btn-primary text-sm">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
        Analyze Sprint Load
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Sprint Load Impact Analysis</h3>
          <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {batchAnalyzeMutation.isPending && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Analyzing {workItemIds.length} items...</p>
            </div>
          )}

          {batchAnalyzeMutation.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 font-medium">Analysis Error</p>
              <p className="text-red-600 text-sm mt-1">{batchAnalyzeMutation.error.message}</p>
            </div>
          )}

          {results && (
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.workItemId} className="border border-slate-200 rounded-lg p-4">
                  <h4 className="font-semibold text-slate-900 mb-3">{result.title}</h4>

                  {result.error ? (
                    <p className="text-red-600 text-sm">{result.error}</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{result.analysis.overall_status}</span>
                        <span className="text-sm text-slate-600">{result.analysis.recommendation}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded p-3">
                          <p className="text-xs text-slate-600 mb-1">Effort</p>
                          <p className="text-lg font-bold text-slate-900">{result.analysis.effort.predicted_hours}h</p>
                          <p className="text-xs text-slate-500">{result.analysis.effort.status}</p>
                        </div>

                        <div className="bg-slate-50 rounded p-3">
                          <p className="text-xs text-slate-600 mb-1">Quality Risk</p>
                          <p className="text-lg font-bold text-slate-900">
                            {(result.analysis.quality_risk.probability * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-slate-500">{result.analysis.quality_risk.risk_level}</p>
                        </div>

                        <div className="bg-slate-50 rounded p-3">
                          <p className="text-xs text-slate-600 mb-1">Productivity</p>
                          <p className="text-lg font-bold text-slate-900">
                            {result.analysis.productivity_impact.impact_percentage.toFixed(1)}%
                          </p>
                          <p className="text-xs text-slate-500">{result.analysis.productivity_impact.status}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button onClick={() => setIsOpen(false)} className="btn btn-primary">
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

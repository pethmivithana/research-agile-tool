import React from 'react';

export default function ModelsAndRecommendationsPage({ impacts }) {
  if (!impacts) return <div className="text-gray-500">No ML analysis available yet.</div>;

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-lg border-b pb-2">🤖 AI Risk Assessment</h3>
      
      {/* Visualizing the Risks */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-3 rounded ${impacts.scheduleRisk > 0.5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          <div className="text-xs uppercase font-bold">Schedule Risk</div>
          <div className="text-2xl">{(impacts.scheduleRisk * 100).toFixed(0)}%</div>
        </div>

        <div className={`p-3 rounded ${impacts.qualityRisk > 0.4 ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>
          <div className="text-xs uppercase font-bold">Quality Risk</div>
          <div className="text-2xl">{(impacts.qualityRisk * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}
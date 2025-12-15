// frontend/src/features/changes/ChangeResultsPage.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChangeApi } from '../../api/changeApi.js';

export default function ChangeResultsPage() {
  const { changeId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['change', changeId],
    queryFn: () => ChangeApi.get(changeId).then((res) => res.data),
    enabled: !!changeId,
  });

  if (isLoading) return <div className="p-6">Loading change results...</div>;
  if (error) return <div className="p-6 text-red-600">Error loading change results</div>;

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Change Results</h2>
      {data ? (
        <div className="space-y-4">
          <div className="card">
            <h3 className="font-semibold">Title</h3>
            <p>{data.title}</p>
          </div>
          <div className="card">
            <h3 className="font-semibold">Description</h3>
            <p>{data.description}</p>
          </div>
          <div className="card">
            <h3 className="font-semibold">Impact Analysis</h3>
            <pre className="bg-slate-100 p-2 rounded text-sm">
              {JSON.stringify(data.impactAnalysis, null, 2)}
            </pre>
          </div>
          <div className="card">
            <h3 className="font-semibold">Recommendations</h3>
            <ul className="list-disc pl-6">
              {data.recommendations?.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <p>No results found for this change.</p>
      )}
    </div>
  );
}

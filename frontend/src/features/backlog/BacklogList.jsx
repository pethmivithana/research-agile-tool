// frontend/src/features/backlog/BacklogList.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BacklogApi } from '../../api/backlogApi.js';

export default function BacklogList() {
  const { spaceId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['backlog', spaceId],
    queryFn: () => BacklogApi.list(spaceId).then((r) => r.data),
    enabled: !!spaceId,
  });

  if (isLoading) return <div>Loading backlog...</div>;
  if (error) return <div>Error loading backlog</div>;

  return (
    <ul className="space-y-2">
      {data?.map((item) => (
        <li key={item._id} className="bg-slate-100 rounded p-2">
          <div className="text-sm font-medium">{item.title}</div>
          <div className="text-xs text-slate-600">
            {item.type} • {item.priority} • SP {item.storyPoints || '-'}
          </div>
        </li>
      ))}
    </ul>
  );
}

import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SprintsApi } from '../../api/sprintsApi.js';

export default function SprintList() {
  const { spaceId } = useParams();
  const { data } = useQuery(['sprints', spaceId], () => SprintsApi.list(spaceId).then(r=>r.data));

  return (
    <ul className="space-y-2">
      {data?.map(s => (
        <li key={s._id} className="bg-slate-100 rounded p-2">
          {s.name} • {s.status}
        </li>
      ))}
    </ul>
  );
}

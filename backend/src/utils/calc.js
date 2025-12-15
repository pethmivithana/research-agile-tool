// Sprint velocity and analytics calculations

export function averageVelocity(sprints) {
  if (!sprints.length) return 0;
  const velocities = sprints.map(s => s.metrics?.velocity || 0);
  return Math.round(velocities.reduce((a,b)=>a+b,0) / velocities.length);
}

export function spilloverRate(committed, completed) {
  if (!committed) return 0;
  return (committed - completed) / committed;
}

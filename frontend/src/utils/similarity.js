// Placeholder similarity function for comparing tasks

export function cosineSimilarity(strA, strB) {
  if (!strA || !strB) return 0;
  const a = strA.toLowerCase().split(/\W+/);
  const b = strB.toLowerCase().split(/\W+/);
  const set = new Set([...a, ...b]);
  let dot = 0, aMag = 0, bMag = 0;
  set.forEach(word => {
    const aCount = a.filter(w => w === word).length;
    const bCount = b.filter(w => w === word).length;
    dot += aCount * bCount;
    aMag += aCount * aCount;
    bMag += bCount * bCount;
  });
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag) || 1);
}

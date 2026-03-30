export type SimilarityWarning = {
  aTaskId: string;
  bTaskId: string;
  aTitle: string;
  bTitle: string;
  similarity: number;
};

type SimilarityInput = {
  taskId: string;
  title: string;
  content: string;
};

function normalize(text: string) {
  return String(text || "")
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "")
    .toLowerCase();
}

function toBigrams(text: string) {
  const normalized = normalize(text);
  const safe = normalized.slice(0, 1600);
  const grams = new Set<string>();
  if (safe.length < 2) {
    if (safe) grams.add(safe);
    return grams;
  }
  for (let index = 0; index < safe.length - 1; index += 1) {
    grams.add(safe.slice(index, index + 2));
  }
  return grams;
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  a.forEach((value) => {
    if (b.has(value)) intersection += 1;
  });
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

export function findSimilarityWarnings(items: SimilarityInput[], threshold = 0.75) {
  const warnings: SimilarityWarning[] = [];
  const prepared = items.map((item) => ({
    ...item,
    grams: toBigrams(`${item.title}\n${item.content}`),
  }));

  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const similarity = jaccard(prepared[i].grams, prepared[j].grams);
      if (similarity > threshold) {
        warnings.push({
          aTaskId: prepared[i].taskId,
          bTaskId: prepared[j].taskId,
          aTitle: prepared[i].title,
          bTitle: prepared[j].title,
          similarity: Number(similarity.toFixed(2)),
        });
      }
    }
  }

  return warnings.sort((left, right) => right.similarity - left.similarity);
}

export function orderDepartmentTree<T extends { id: string; parentId: string | null; name: string }>(departments: T[]) {
  const children = new Map<string | null, T[]>();
  for (const department of departments) {
    const siblings = children.get(department.parentId) ?? [];
    siblings.push(department);
    children.set(department.parentId, siblings);
  }
  for (const siblings of children.values()) siblings.sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const ordered: Array<T & { depth: number }> = [];
  const visited = new Set<string>();
  const append = (parentId: string | null, depth: number) => {
    for (const department of children.get(parentId) ?? []) {
      if (visited.has(department.id)) continue;
      visited.add(department.id);
      ordered.push({ ...department, depth });
      append(department.id, depth + 1);
    }
  };

  append(null, 0);
  for (const department of departments) {
    if (!visited.has(department.id)) ordered.push({ ...department, depth: 0 });
  }
  return ordered;
}

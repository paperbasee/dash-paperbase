import type { AdminCategoryTreeNode } from "@/types";

/** Flat list for `<select>`: indented labels by depth. */
export function flattenCategoryOptions(
  nodes: AdminCategoryTreeNode[],
  prefix = ""
): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (const n of nodes) {
    out.push({ value: n.public_id, label: `${prefix}${n.name}` });
    if (n.children?.length) {
      out.push(...flattenCategoryOptions(n.children, `${prefix}— `));
    }
  }
  return out;
}

export function collectDescendantPublicIds(node: AdminCategoryTreeNode): Set<string> {
  const s = new Set<string>([node.public_id]);
  for (const ch of node.children ?? []) {
    for (const id of collectDescendantPublicIds(ch)) {
      s.add(id);
    }
  }
  return s;
}

export function findCategoryNode(
  nodes: AdminCategoryTreeNode[],
  publicId: string
): AdminCategoryTreeNode | null {
  for (const n of nodes) {
    if (n.public_id === publicId) {
      return n;
    }
    const hit = findCategoryNode(n.children ?? [], publicId);
    if (hit) {
      return hit;
    }
  }
  return null;
}

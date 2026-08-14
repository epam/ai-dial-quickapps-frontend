import { DialPrompt } from '@/types/dial-entities';
import { FriendlyFolderPath, PromptFolderRoot } from '@/types/skill-validation';

export interface PromptTreeNode {
  id: string;
  name: string;
  prompts: DialPrompt[];
  children: PromptTreeNode[];
}

export const buildPromptTree = (prompts: DialPrompt[], bucketRoot: string): PromptTreeNode => {
  const promptsByFolder = new Map<string, DialPrompt[]>();
  prompts.forEach((p) => {
    const list = promptsByFolder.get(p.folderId) ?? [];
    list.push(p);
    promptsByFolder.set(p.folderId, list);
  });

  const allFolderIds = new Set<string>();
  prompts.forEach((p) => {
    let fid = p.folderId;
    while (fid && fid !== bucketRoot) {
      allFolderIds.add(fid);
      const lastSlash = fid.lastIndexOf('/');
      if (lastSlash < 0) break;
      fid = fid.slice(0, lastSlash);
    }
  });

  const nodeMap = new Map<string, PromptTreeNode>();
  const root: PromptTreeNode = {
    id: bucketRoot,
    name: '',
    prompts: promptsByFolder.get(bucketRoot) ?? [],
    children: [],
  };
  nodeMap.set(bucketRoot, root);

  allFolderIds.forEach((fid) => {
    nodeMap.set(fid, {
      id: fid,
      name: fid.split('/').pop() ?? fid,
      prompts: promptsByFolder.get(fid) ?? [],
      children: [],
    });
  });

  allFolderIds.forEach((fid) => {
    const lastSlash = fid.lastIndexOf('/');
    const parentId = lastSlash > 0 ? fid.slice(0, lastSlash) : bucketRoot;
    const parent = nodeMap.get(parentId) ?? root;
    const child = nodeMap.get(fid)!;
    parent.children.push(child);
  });

  sortPromptTree(root);

  return root;
};

const sortPromptTree = (node: PromptTreeNode): void => {
  node.prompts.sort((a, b) =>
    getDisplayName(a.name).localeCompare(getDisplayName(b.name), undefined, {
      sensitivity: 'base',
    }),
  );
  node.children.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  node.children.forEach(sortPromptTree);
};

export const matchesSearch = (p: DialPrompt, lower: string): boolean =>
  p.name.toLowerCase().includes(lower) || p.id.toLowerCase().includes(lower);

export const nodeHasMatch = (node: PromptTreeNode, lower: string): boolean => {
  if (node.prompts.some((p) => matchesSearch(p, lower))) return true;
  return node.children.some((c) => nodeHasMatch(c, lower));
};

export const getDisplayName = (name: string): string =>
  name.replace(/\.json$/i, '').replace(/__[\d.]+$/, '');

export const promptPathUrl = (promptId: string): string => {
  const suffix = promptId.replace(/^prompts\//, '');
  const encoded = suffix.split('/').map(encodeURIComponent).join('/');
  return `/api/dial/v1/prompts/${encoded}`;
};

export const getFriendlyFolderPath = (folderId: string): FriendlyFolderPath => {
  if (folderId === 'prompts/public') {
    return { root: PromptFolderRoot.Organization, sub: '' };
  }
  if (folderId.startsWith('prompts/public/')) {
    return {
      root: PromptFolderRoot.Organization,
      sub: folderId.slice('prompts/public/'.length),
    };
  }
  // personal: "prompts/{bucket}" or "prompts/{bucket}/sub/..."
  const parts = folderId.split('/');
  return { root: PromptFolderRoot.Personal, sub: parts.slice(2).join('/') };
};

export const getAllPromptIds = (node: PromptTreeNode): string[] => {
  const ids: string[] = node.prompts.map((p) => p.id);
  node.children.forEach((child) => {
    ids.push(...getAllPromptIds(child));
  });
  return ids;
};

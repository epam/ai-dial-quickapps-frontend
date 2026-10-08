import { useCallback, useEffect, useRef, useState } from 'react';

import type { DialSkill } from '@/types/dial-entities';
import { ManifestStatus, type SkillManifest } from '@/types/skill-manifest';
import { fetchSkillManifest } from '@/utils/dial-client';
import { parseSkillManifest } from '@/utils/parse-skill-manifest';

export interface UseSkillManifestResult {
  status: ManifestStatus;
  manifest?: SkillManifest;
  retry: () => void;
}

interface ManifestState {
  /** The request this result belongs to — `${skillId}#${attempt}`. */
  requestKey: string;
  status: ManifestStatus.Ready | ManifestStatus.Error;
  manifest?: SkillManifest;
}

/**
 * Loads and parses a skill's `SKILL.md` while the caller is mounted. With no
 * skill (e.g. one no longer in the catalog) nothing is requested. A response
 * for a previous skill or attempt is dropped, and leaving aborts the request.
 */
export const useSkillManifest = (skill?: DialSkill): UseSkillManifestResult => {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<ManifestState | null>(null);

  // The effect re-runs on the skill id only; a refreshed catalog hands over a
  // new object for the same skill, which must not refetch.
  const skillRef = useRef(skill);
  skillRef.current = skill;

  const skillId = skill?.id;
  const requestKey = skillId == null ? null : `${skillId}#${attempt}`;

  useEffect(() => {
    const currentSkill = skillRef.current;
    if (requestKey == null || currentSkill == null) return undefined;

    let isCancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const text = await fetchSkillManifest(currentSkill, controller.signal);
        if (!isCancelled) {
          setResult({
            requestKey,
            status: ManifestStatus.Ready,
            manifest: parseSkillManifest(text),
          });
        }
      } catch {
        if (!isCancelled) setResult({ requestKey, status: ManifestStatus.Error });
      }
    };

    void load();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [requestKey]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (requestKey == null) return { status: ManifestStatus.Idle, retry };
  if (result?.requestKey !== requestKey) return { status: ManifestStatus.Loading, retry };
  return { status: result.status, manifest: result.manifest, retry };
};

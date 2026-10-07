import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useSkillManifest, type UseSkillManifestResult } from '@/hooks/use-skill-manifest';
import type { DialSkill } from '@/types/dial-entities';
import { ManifestStatus } from '@/types/skill-manifest';

const { fetchSkillManifest } = vi.hoisted(() => ({ fetchSkillManifest: vi.fn() }));

vi.mock('@/utils/dial-client', () => ({ fetchSkillManifest }));

const makeSkill = (id: string): DialSkill => ({ id, reference: id, name: id, type: 'skill' });

interface Deferred {
  resolve: (text: string) => void;
  reject: (error: Error) => void;
}

const defer = (): Deferred => {
  const deferred = {} as Deferred;
  fetchSkillManifest.mockImplementationOnce(
    () =>
      new Promise<string>((resolve, reject) => {
        deferred.resolve = resolve;
        deferred.reject = reject;
      }),
  );
  return deferred;
};

let root: Root;
let latest: UseSkillManifestResult;

const Harness = ({ skill }: { skill?: DialSkill }) => {
  latest = useSkillManifest(skill);
  return null;
};

const render = (skill?: DialSkill) => {
  act(() => {
    root.render(<Harness skill={skill} />);
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  fetchSkillManifest.mockReset();
  root = createRoot(document.createElement('div'));
});

afterEach(() => {
  act(() => root.unmount());
});

describe('useSkillManifest', () => {
  it('reports loading, then the parsed manifest', async () => {
    const request = defer();
    render(makeSkill('skills/public/a'));

    expect(latest.status).toBe(ManifestStatus.Loading);

    await act(async () => request.resolve('---\ndescription: Hi\n---\n# Body'));

    expect(latest.status).toBe(ManifestStatus.Ready);
    expect(latest.manifest).toEqual({ description: 'Hi', body: '# Body' });
  });

  it('reports an error and loads again on retry', async () => {
    const failing = defer();
    render(makeSkill('skills/public/a'));
    await act(async () => failing.reject(new Error('boom')));

    expect(latest.status).toBe(ManifestStatus.Error);

    const retried = defer();
    act(() => latest.retry());

    expect(latest.status).toBe(ManifestStatus.Loading);

    await act(async () => retried.resolve('Body'));

    expect(latest.status).toBe(ManifestStatus.Ready);
    expect(fetchSkillManifest).toHaveBeenCalledTimes(2);
  });

  it('makes no request without a skill', () => {
    render(undefined);

    expect(latest.status).toBe(ManifestStatus.Idle);
    expect(fetchSkillManifest).not.toHaveBeenCalled();
  });

  it('ignores a response for a skill that is no longer shown', async () => {
    const first = defer();
    const second = defer();
    render(makeSkill('skills/public/a'));
    render(makeSkill('skills/public/b'));

    await act(async () => first.resolve('First'));

    expect(latest.status).toBe(ManifestStatus.Loading);

    await act(async () => second.resolve('Second'));

    expect(latest.manifest?.body).toBe('Second');
  });

  it('does not refetch when the same skill arrives as a new object', () => {
    defer();
    render(makeSkill('skills/public/a'));
    render(makeSkill('skills/public/a'));

    expect(fetchSkillManifest).toHaveBeenCalledTimes(1);
  });

  it('aborts the request on unmount', () => {
    defer();
    render(makeSkill('skills/public/a'));
    const signal = fetchSkillManifest.mock.calls[0][1] as AbortSignal;

    act(() => root.unmount());
    root = createRoot(document.createElement('div'));

    expect(signal.aborted).toBe(true);
  });
});

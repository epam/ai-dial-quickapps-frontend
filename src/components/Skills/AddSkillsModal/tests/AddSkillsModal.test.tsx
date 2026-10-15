import { CatalogEntityType } from '@epam/ai-dial-chat-shared';
import { describe, expect, it, vi } from 'vitest';

import {
  ApplicationEditorI18nKeys,
  BasicI18nKeys,
  CatalogI18nKeys,
} from '@/constants/translation-keys';
import { setupTestRoot } from '@/test-utils/test-root';
import { DialEntityType } from '@/types/dial-entities';
import type { AddOnCatalogModalProps } from '@/components/common/AddOnCatalogModal/AddOnCatalogModal';
import type { DialSkill } from '@/types/dial-entities';

import { AddSkillsModal } from '../AddSkillsModal';

const { captured } = vi.hoisted(() => ({ captured: { props: undefined as unknown } }));

const USER_BUCKET = 'user-bucket-123';

const makeSkill = (id: string, name: string, overrides: Partial<DialSkill> = {}): DialSkill => ({
  id,
  reference: id,
  name,
  type: DialEntityType.Skill,
  ...overrides,
});

const WEB_SEARCH = makeSkill('skills/public/web-search', 'Web Search');
const MINE = makeSkill(`skills/${USER_BUCKET}/mine`, 'My notes', { isMy: true });
const HIDDEN = makeSkill('skills/public/.dial_folder', '.dial_folder');

vi.mock('@/context/DataContext', () => ({
  useDataContext: () => ({ skills: [WEB_SEARCH, HIDDEN, MINE], userBucket: USER_BUCKET }),
}));
vi.mock('@/components/common/AddOnCatalogModal/AddOnCatalogModal', () => ({
  AddOnCatalogModal: (props: unknown) => {
    captured.props = props;
    return null;
  },
}));

const dom = setupTestRoot();

describe('AddSkillsModal', () => {
  it('offers the visible skills with their folder and checks the attached ones', () => {
    const onConfirm = vi.fn();
    const value = [WEB_SEARCH.id, 'skills/public/deleted'];
    dom.render(<AddSkillsModal value={value} onConfirm={onConfirm} onClose={vi.fn()} />);

    const props = captured.props as AddOnCatalogModalProps;
    expect(props.type).toBe(CatalogEntityType.Skill);
    expect(props.items.map((item) => [item.name, item.folder.join(' / ')])).toEqual([
      ['Web Search', BasicI18nKeys.Organization],
      ['My notes', CatalogI18nKeys.FolderPersonal],
    ]);
    expect(props.attachedIds).toEqual(value);
    expect(props.initialCheckedIds).toEqual(value);
    expect(props.onConfirm).toBe(onConfirm);
  });

  it('labels the popup for skills', () => {
    dom.render(<AddSkillsModal value={[]} onConfirm={vi.fn()} onClose={vi.fn()} />);

    const { labels } = captured.props as AddOnCatalogModalProps;
    expect(labels).toMatchObject({
      title: ApplicationEditorI18nKeys.SkillsAdd,
      catalog: ApplicationEditorI18nKeys.SkillsCatalogTitle,
      search: ApplicationEditorI18nKeys.SkillsSearchPlaceholder,
      loading: ApplicationEditorI18nKeys.SkillsLoading,
      failedToLoad: CatalogI18nKeys.SkillsLoadError,
      empty: ApplicationEditorI18nKeys.SkillsEmpty,
      selectAll: ApplicationEditorI18nKeys.SkillsSelectAll,
    });
    expect(labels.selectRow('Web Search')).toBe(ApplicationEditorI18nKeys.AddOnsSelect);
  });
});

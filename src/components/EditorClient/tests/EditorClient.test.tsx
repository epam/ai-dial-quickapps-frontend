import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTO_SAVE_INTERVAL_MS, DIAL_EDITOR_TRIGGER_SAVE_EVENT } from '@/constants/editor';
import { CommonI18nKeys } from '@/constants/i18n';
import type { QuickApp2AllEntitiesMap } from '@/components/QuickApp2Form/QuickApp2Form';
import type { QuickApp2Form } from '@/form/quickApp2Form';
import {
  InboundMessageType,
  OutboundMessageType,
  type TriggerSaveEventDetail,
  type TriggerSaveGeneralPayload,
} from '@/types/editor-messages';
import { ForbiddenError } from '@/utils/forbidden-error';

type FormSaveHandler = (
  data: QuickApp2Form,
  allEntitiesMap: QuickApp2AllEntitiesMap,
  isAutoSave?: boolean,
  general?: TriggerSaveGeneralPayload,
) => Promise<void>;

interface FormStandInProps {
  onSave: FormSaveHandler;
  onDirtyChange: (isDirty: boolean) => void;
  onModelReady?: () => void;
}

const mocks = vi.hoisted(() => ({
  fetchDialApp: vi.fn(),
  fetchAppSettings: vi.fn(),
  saveDialApp: vi.fn(),
  buildQuickApp2Config: vi.fn(),
  hasQuickAppChanges: vi.fn(),
  formMounts: 0,
  formProps: null as FormStandInProps | null,
}));

vi.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ language: 'en', t: (key: string) => key }),
}));

vi.mock('@/utils/dial-client', () => ({
  fetchDialApp: mocks.fetchDialApp,
  fetchAppSettings: mocks.fetchAppSettings,
  saveDialApp: mocks.saveDialApp,
  decodeDialPath: (url: string) => url.split('/').map(decodeURIComponent).join('/'),
}));

vi.mock('@/form/quickApp2Form', () => ({
  buildQuickApp2Config: mocks.buildQuickApp2Config,
}));

vi.mock('@/utils/has-quick-app-changes', () => ({
  hasQuickAppChanges: mocks.hasQuickAppChanges,
}));

vi.mock('@/context/DataContext', () => ({
  DataContextProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ForbiddenPage/ForbiddenPage', () => ({
  default: () => <h1>Forbidden page</h1>,
}));

vi.mock('@/components/QuickApp2Form/QuickApp2Form', async () => {
  const { useEffect } = await import('react');
  const { useAppContext } = await import('@/context/AppContext');

  const QuickApp2FormStandIn = (props: FormStandInProps) => {
    const { app } = useAppContext();
    mocks.formProps = props;
    useEffect(() => {
      mocks.formMounts += 1;
    }, []);
    return <form aria-label="Quick app form" data-app-id={app.id} data-app-name={app.name} />;
  };

  return { QuickApp2Form: QuickApp2FormStandIn };
});

import EditorClient from '@/components/EditorClient/EditorClient';

const APP_ID = 'applications/bucket/support-bot__1.0.0';
const HOST = 'https://chat.example.com';
const OTHER_ORIGIN = 'https://evil.example.com';
const BUILT_CONFIG = { orchestrator: { system_prompt: { content: 'Be helpful' } } };
const FORM_DATA = { inputAttachmentTypes: ['application/pdf'], maxInputAttachments: 3 };

let root: Root;
let container: HTMLDivElement;
let postMessage: ReturnType<typeof vi.spyOn>;
let triggerSaveDetails: TriggerSaveEventDetail[];

const handleTriggerSave = (event: Event) => {
  triggerSaveDetails.push((event as CustomEvent<TriggerSaveEventDetail>).detail);
};

const flush = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

const renderEditor = async (search = `?id=${encodeURIComponent(APP_ID)}`) => {
  window.history.replaceState(null, '', `/${search}`);
  await act(async () => root.render(<EditorClient />));
  await flush();
};

const sendHostMessage = async (data: unknown, origin = HOST) => {
  await act(async () => {
    window.dispatchEvent(new MessageEvent('message', { data, origin }));
  });
};

const postedMessages = () => postMessage.mock.calls.map((call: unknown[]) => call[0]);

const postedTypes = () => postedMessages().map((msg: unknown) => (msg as { type: string }).type);

const getForm = () => container.querySelector('form[aria-label="Quick app form"]');

const saveFromForm = async (isAutoSave: boolean, general?: TriggerSaveGeneralPayload) => {
  await act(async () => {
    await mocks.formProps?.onSave(FORM_DATA as unknown as QuickApp2Form, {}, isAutoSave, general);
  });
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as Record<string, unknown>).ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  vi.clearAllMocks();
  mocks.formMounts = 0;
  mocks.formProps = null;
  mocks.fetchDialApp.mockResolvedValue({ id: APP_ID, name: 'Support bot' });
  mocks.fetchAppSettings.mockResolvedValue({ allowedOrigins: [HOST] });
  mocks.saveDialApp.mockResolvedValue({ id: APP_ID, name: 'Support bot' });
  mocks.buildQuickApp2Config.mockReturnValue(BUILT_CONFIG);
  mocks.hasQuickAppChanges.mockReturnValue({ hasChanges: true });
  postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  triggerSaveDetails = [];
  window.addEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  window.removeEventListener(DIAL_EDITOR_TRIGGER_SAVE_EVENT, handleTriggerSave);
  postMessage.mockRestore();
  vi.useRealTimers();
  window.history.replaceState(null, '', '/');
});

describe('EditorClient host handshake', () => {
  it('posts READY to the host on mount', async () => {
    await renderEditor();

    expect(postedMessages()[0]).toEqual({ type: OutboundMessageType.Ready });
  });
});

describe('EditorClient application load outcomes', () => {
  it('shows a loading spinner while the application loads', async () => {
    mocks.fetchDialApp.mockReturnValue(new Promise(() => {}));

    await renderEditor();

    expect(container.querySelector(`[aria-label="${CommonI18nKeys.Loading}"]`)).not.toBeNull();
    expect(getForm()).toBeNull();
  });

  it('renders the editor form for an existing application', async () => {
    await renderEditor();

    expect(mocks.fetchDialApp).toHaveBeenCalledWith(APP_ID);
    expect(getForm()?.getAttribute('data-app-name')).toBe('Support bot');
  });

  it('opens a missing application as a new one with the entry URL id and an empty name', async () => {
    mocks.fetchDialApp.mockResolvedValue(null);

    await renderEditor();

    expect(getForm()?.getAttribute('data-app-id')).toBe(APP_ID);
    expect(getForm()?.getAttribute('data-app-name')).toBe('');
  });

  it('renders the forbidden page and no form when the user may not open the application', async () => {
    mocks.fetchDialApp.mockRejectedValue(new ForbiddenError());

    await renderEditor();

    expect(container.querySelector('h1')?.textContent).toBe('Forbidden page');
    expect(getForm()).toBeNull();
  });

  it('renders the failure message and no form when the load fails for another reason', async () => {
    mocks.fetchDialApp.mockRejectedValue(new Error('Service unavailable'));

    await renderEditor();

    expect(container.textContent).toBe('Service unavailable');
    expect(getForm()).toBeNull();
  });
});

describe('EditorClient save trigger gating', () => {
  it('ignores a TriggerAutoSave before the first save of a new application', async () => {
    mocks.fetchDialApp.mockResolvedValue(null);
    await renderEditor();

    await sendHostMessage({
      type: InboundMessageType.TriggerAutoSave,
      payload: { ignoreDirty: true },
    });

    expect(triggerSaveDetails).toEqual([]);
  });

  it('accepts a TriggerAutoSave for a new application once a save has succeeded', async () => {
    mocks.fetchDialApp.mockResolvedValue(null);
    await renderEditor();
    await saveFromForm(false);

    await sendHostMessage({ type: InboundMessageType.TriggerAutoSave });

    expect(triggerSaveDetails).toHaveLength(1);
    expect(triggerSaveDetails[0].isAutoSave).toBe(true);
  });

  it('forwards TriggerAutoSave ignoreDirty as shouldIgnoreDirty without a general payload', async () => {
    await renderEditor();

    await sendHostMessage({
      type: InboundMessageType.TriggerAutoSave,
      payload: { ignoreDirty: true },
      general: { name: 'Ignored' },
    });

    expect(triggerSaveDetails).toEqual([
      { isAutoSave: true, shouldIgnoreDirty: true, general: undefined },
    ]);
  });

  it('forwards a TriggerSave general payload to the form as a manual save', async () => {
    await renderEditor();
    const general = { name: 'Support bot', iconUrl: 'icon.svg' };

    await sendHostMessage({ type: InboundMessageType.TriggerSave, general });

    expect(triggerSaveDetails).toEqual([
      { isAutoSave: false, shouldIgnoreDirty: undefined, general },
    ]);
  });

  it('ignores host messages from an origin outside the allowed origins once settings load', async () => {
    await renderEditor();

    await sendHostMessage({ type: InboundMessageType.TriggerSave }, OTHER_ORIGIN);

    expect(triggerSaveDetails).toEqual([]);
  });
});

describe('EditorClient save outcome messages', () => {
  it('posts SaveSuccess with the updated app and hasChanges after a manual save', async () => {
    mocks.hasQuickAppChanges.mockReturnValue({ hasChanges: false });
    await renderEditor();

    await saveFromForm(false);

    expect(mocks.saveDialApp).toHaveBeenCalledWith(
      expect.objectContaining({ id: APP_ID, ...FORM_DATA }),
      BUILT_CONFIG,
      expect.anything(),
    );
    expect(postMessage).toHaveBeenLastCalledWith(
      {
        type: OutboundMessageType.SaveSuccess,
        payload: { updatedApp: { id: APP_ID, name: 'Support bot' } },
        hasChanges: false,
      },
      HOST,
    );
    expect(postedTypes()).not.toContain(OutboundMessageType.AutoSaveComplete);
  });

  it('posts AutoSaveComplete and no SaveSuccess after an auto-save', async () => {
    await renderEditor();

    await saveFromForm(true);

    expect(postMessage).toHaveBeenLastCalledWith(
      { type: OutboundMessageType.AutoSaveComplete },
      HOST,
    );
    expect(postedTypes()).not.toContain(OutboundMessageType.SaveSuccess);
  });

  it('posts SaveError with the error message when the update request fails', async () => {
    mocks.saveDialApp.mockRejectedValue(new Error('Update failed'));
    await renderEditor();

    await saveFromForm(true);

    expect(postMessage).toHaveBeenLastCalledWith(
      { type: OutboundMessageType.SaveError, payload: { error: 'Update failed' } },
      HOST,
    );
    expect(postedTypes()).not.toContain(OutboundMessageType.AutoSaveComplete);
  });
});

describe('EditorClient auto-save interval', () => {
  it('dispatches an auto-save every interval for an application saved before', async () => {
    vi.useFakeTimers();
    await renderEditor();

    await act(async () => {
      vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS - 1);
    });
    expect(triggerSaveDetails).toEqual([]);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(triggerSaveDetails).toEqual([{ isAutoSave: true }]);

    await act(async () => {
      vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS);
    });
    expect(triggerSaveDetails).toHaveLength(2);
  });

  it('starts the interval for a new application only after the first successful save', async () => {
    vi.useFakeTimers();
    mocks.fetchDialApp.mockResolvedValue(null);
    await renderEditor();

    await act(async () => {
      vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS * 2);
    });
    expect(triggerSaveDetails).toEqual([]);

    await saveFromForm(false);
    await act(async () => {
      vi.advanceTimersByTime(AUTO_SAVE_INTERVAL_MS);
    });
    expect(triggerSaveDetails).toEqual([{ isAutoSave: true }]);
  });
});

describe('EditorClient reset', () => {
  it('remounts the form on Reset without calling chat-api or posting a save outcome', async () => {
    await renderEditor();
    expect(mocks.formMounts).toBe(1);
    const postCount = postMessage.mock.calls.length;

    await sendHostMessage({ type: InboundMessageType.Reset });

    expect(mocks.formMounts).toBe(2);
    expect(mocks.fetchDialApp).toHaveBeenCalledTimes(1);
    expect(mocks.fetchAppSettings).toHaveBeenCalledTimes(1);
    expect(mocks.saveDialApp).not.toHaveBeenCalled();
    expect(postMessage.mock.calls.length).toBe(postCount);
  });
});

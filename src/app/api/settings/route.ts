import { NextResponse } from 'next/server';

import { DEFAULT_QUICK_APPS_MODEL } from '@/constants/quick-apps';
import type { AppSettings } from '@/types/dial-entities';
import { isEnvFlagEnabled } from '@/utils/is-env-flag-enabled';

export const GET = () => {
  const settings: AppSettings = {
    isCodeInterpreterEnabled: isEnvFlagEnabled(process.env.CODE_INTERPRETER_ENABLED),
    isWebFetchEnabled: isEnvFlagEnabled(process.env.WEB_FETCH_ENABLED),
    isAddAttachmentEnabled: isEnvFlagEnabled(process.env.ADD_ATTACHMENT_ENABLED),
    allowedOrigin: process.env.ALLOWED_ORIGIN ?? '*',
    defaultModelId: process.env.QUICK_APPS_DEFAULT_MODEL ?? DEFAULT_QUICK_APPS_MODEL,
    dialAdminHost: process.env.DIAL_ADMIN_URL,
    dialChatHost: process.env.DIAL_CHAT_URL,
    applicationName: process.env.QUICK_APPS_APPLICATION_NAME,
  };

  return NextResponse.json(settings);
};

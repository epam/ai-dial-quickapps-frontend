import { NextResponse } from 'next/server';

import { DEFAULT_QUICK_APPS_MODEL } from '@/constants/quick-apps';
import type { AppSettings } from '@/types/dial-entities';

export const GET = () => {
  const settings: AppSettings = {
    isCodeInterpreterEnabled: process.env.CODE_INTERPRETER_ENABLED === 'true',
    allowedOrigin: process.env.ALLOWED_ORIGIN ?? '*',
    defaultModelId: process.env.QUICK_APPS_DEFAULT_MODEL ?? DEFAULT_QUICK_APPS_MODEL,
    dialAdminHost: process.env.DIAL_ADMIN_URL,
    dialChatHost: process.env.DIAL_CHAT_URL,
    applicationName: process.env.QUICK_APPS_APPLICATION_NAME,
  };

  return NextResponse.json(settings);
};

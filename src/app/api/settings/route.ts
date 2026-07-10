import { NextResponse } from 'next/server';

import { DEFAULT_QUICK_APPS_MODEL } from '@/constants/quick-apps';
import type { AppSettings } from '@/types/dial-entities';

export const GET = () => {
  const settings: AppSettings = {
    isCodeInterpreterEnabled: process.env.CODE_INTERPRETER_ENABLED === 'true',
    allowedOrigin: process.env.ALLOWED_ORIGIN ?? '*',
    defaultModelId: process.env.QUICK_APPS_DEFAULT_MODEL ?? DEFAULT_QUICK_APPS_MODEL,
  };

  return NextResponse.json(settings);
};

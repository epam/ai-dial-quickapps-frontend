import { NextResponse } from "next/server";

import type { AppSettings } from "@/types/dial-entities";

export const GET = () => {
  const settings: AppSettings = {
    isCodeInterpreterEnabled: process.env.CODE_INTERPRETER_ENABLED === "true",
  };

  return NextResponse.json(settings);
};

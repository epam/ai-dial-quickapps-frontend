"use client";
import { useEffect, useState } from "react";

import { useAppContext } from "@/context/AppContext";
import {
  SkillValidationStatus,
  type SkillValidationState,
} from "@/types/skill-validation";

interface SkillValidateResponse {
  valid?: boolean;
  message?: string;
}

/**
 * Validates a prompt as an Agent Skill against the current app's deployment.
 * Requires an app id (only available once the app has been created), matching
 * the DIAL Core `configuration-support/skills/validate` contract.
 *
 * Pass `revalidateToken` (e.g. a counter bumped after each save) to force
 * re-running validation for the same promptId once its content has changed.
 */
export function useSkillValidation(
  promptId: string,
  revalidateToken: string | number = 0,
): SkillValidationState {
  const { app } = useAppContext();
  const deploymentId = app?.id;
  const [state, setState] = useState<SkillValidationState>({
    status: SkillValidationStatus.Unknown,
  });

  useEffect(() => {
    if (!deploymentId || !promptId) return;

    let isCancelled = false;

    const validate = async () => {
      setState({ status: SkillValidationStatus.Validating });
      try {
        const res = await fetch("/api/skill-validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deploymentId, url: promptId }),
        });
        const data = (await res.json()) as SkillValidateResponse;
        if (isCancelled) return;
        setState({
          status: data.valid
            ? SkillValidationStatus.Valid
            : SkillValidationStatus.Invalid,
          message: data.message,
        });
      } catch {
        if (isCancelled) return;
        setState({ status: SkillValidationStatus.Invalid });
      }
    };

    void validate();

    return () => {
      isCancelled = true;
    };
  }, [deploymentId, promptId, revalidateToken]);

  return state;
}

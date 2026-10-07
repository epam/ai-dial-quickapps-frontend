import type { ConversationStarter } from '@/types/quick-apps';

export interface StarterWithId extends ConversationStarter {
  id: string;
}

export type StarterField = keyof ConversationStarter;

export interface ConversationStartersValues {
  starters: StarterWithId[];
  introText?: string;
  autoSubmit: boolean;
  chatMessageInputDisabled: boolean;
}

export enum StarterSelectionBehavior {
  SendPrompt = 'send-prompt',
  PopulateInput = 'populate-input',
}

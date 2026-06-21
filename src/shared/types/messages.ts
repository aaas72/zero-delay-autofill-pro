// ─── Message Types ─────────────────────────────────────────────────────────────
// Typed messages for communication between popup ↔ content script ↔ background

export enum MessageType {
  FILL_FORM = 'FILL_FORM',
  FILL_RESULT = 'FILL_RESULT',
  GET_STATUS = 'GET_STATUS',
  STATUS_RESPONSE = 'STATUS_RESPONSE',
  PROFILE_UPDATED = 'PROFILE_UPDATED',
}

export interface FillFormMessage {
  type: MessageType.FILL_FORM;
  profileId: string;
}

export interface FillResultMessage {
  type: MessageType.FILL_RESULT;
  success: boolean;
  filledCount: number;
  totalFields: number;
  errors: string[];
}

export interface GetStatusMessage {
  type: MessageType.GET_STATUS;
}

export interface StatusResponseMessage {
  type: MessageType.STATUS_RESPONSE;
  ready: boolean;
  currentUrl: string;
  detectedFields: number;
}

export interface ProfileUpdatedMessage {
  type: MessageType.PROFILE_UPDATED;
  profileId: string;
}

export type ExtensionMessage =
  | FillFormMessage
  | FillResultMessage
  | GetStatusMessage
  | StatusResponseMessage
  | ProfileUpdatedMessage;

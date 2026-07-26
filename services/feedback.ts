import { DeviceEventEmitter } from 'react-native';
import { logInfo } from './logger';

type ToastDuration = 'short' | 'long';

type FeedbackTone = 'default' | 'error';

export const FEEDBACK_EVENT = 'notif:feedback';

export interface FeedbackPayload {
  message: string;
  duration?: ToastDuration;
  tone?: FeedbackTone;
}

export const showTransientMessage = (
  message: string,
  duration: ToastDuration = 'short',
  tone: FeedbackTone = 'default'
) => {
  const payload: FeedbackPayload = { message, duration, tone };
  DeviceEventEmitter.emit(FEEDBACK_EVENT, payload);
  logInfo('Feedback', 'Transient message', payload);
};

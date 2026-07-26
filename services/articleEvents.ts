import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

const ARTICLES_CHANGED_EVENT = 'notif:articlesChanged';

export const emitArticlesChanged = () => {
  DeviceEventEmitter.emit(ARTICLES_CHANGED_EVENT);
};

export const addArticlesChangedListener = (
  listener: () => void
): EmitterSubscription => (
  DeviceEventEmitter.addListener(ARTICLES_CHANGED_EVENT, listener)
);

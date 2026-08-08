const androidVersionCode = Number(process.env.ANDROID_VERSION_CODE || 26);
const androidVersionName = process.env.ANDROID_VERSION_NAME || '3.0';

module.exports = {
  name: 'NotiF',
  slug: 'notif-bookmark',
  version: androidVersionName,
  android: {
    package: 'com.instachat',
    versionCode: androidVersionCode,
  },
  extra: {
    buildPipeline: {
      android: 'eas',
      ios: 'codemagic',
    },
  },
};

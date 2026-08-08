const androidVersionCode = Number(process.env.ANDROID_VERSION_CODE || 26);
const androidVersionName = process.env.ANDROID_VERSION_NAME || '3.0';

module.exports = {
  name: 'NotiF',
  slug: 'notif-bookmark',
  version: androidVersionName,
  android: {
    package: 'com.addybot.notifbookmark',
    versionCode: androidVersionCode,
  },
  extra: {
    eas: {
      projectId: 'f26dd166-0fdb-47de-97eb-4cbbee547f95',
    },
    buildPipeline: {
      android: 'eas',
      ios: 'codemagic',
    },
  },
};

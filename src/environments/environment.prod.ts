export const environment = {
  production: true,
  defaultauth: 'fackbackend',
  firebaseConfig: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    measurementId: ''
  },
  pusher: {
    key: '3cfb434018939310b096',
    cluster: 'us2',
    channelPrefix: 'notifications',
    globalChannel: 'notifications.global',
    forceTLS: true,
    logToConsole: false
  }
};

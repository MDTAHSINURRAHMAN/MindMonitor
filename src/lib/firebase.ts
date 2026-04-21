import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyBw2MAuYas1YvaKEC2d5vn64HkUYNEWLjA',
  authDomain: 'mindmonitor-2c5f1.firebaseapp.com',
  databaseURL: 'https://mindmonitor-2c5f1-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'mindmonitor-2c5f1',
  storageBucket: 'mindmonitor-2c5f1.firebasestorage.app',
  messagingSenderId: '40040536527',
  appId: '1:40040536527:web:30c1aa019fa16aa39e1aba',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const rtdb = getDatabase(app);

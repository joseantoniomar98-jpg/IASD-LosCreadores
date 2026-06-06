import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from './firebase';

/**
 * Fetches all items from a collection
 */
export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.docs.map(doc => doc.data() as T);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
    return [];
  }
}

/**
 * Subscribes to changes in a collection
 */
export function subscribeCollection<T>(
  collectionName: string, 
  onUpdate: (items: T[]) => void
): () => void {
  const colRef = collection(db, collectionName);
  return onSnapshot(colRef, (snapshot) => {
    const items = snapshot.docs.map(doc => doc.data() as T);
    onUpdate(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, collectionName);
  });
}

/**
 * Deeply sanitizes an object to remove any keys with 'undefined' values,
 * which Firestore does not support.
 */
function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        cleaned[key] = cleanUndefined(obj[key]);
      }
    }
    return cleaned;
  }
  return obj;
}

/**
 * Sets/Upserts a document to Firestore
 */
export async function setFirestoreDoc(collectionName: string, docId: string, data: any): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    const sanitized = cleanUndefined(data);
    await setDoc(docRef, sanitized, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Deletes a document from Firestore
 */
export async function deleteFirestoreDoc(collectionName: string, docId: string): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Checks if a collection is empty, and optionally seeds it.
 */
export async function seedCollectionIfEmpty(collectionName: string, seedData: any[]): Promise<any[]> {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      console.log(`Seeding empty collection: ${collectionName} with ${seedData.length} items`);
      for (const item of seedData) {
        // Find a suitable ID or generate one
        const docId = item.id || item.voto || item.fecha || `${collectionName}-${Math.random().toString(36).substr(2, 9)}`;
        const docRef = doc(db, collectionName, docId);
        const sanitized = cleanUndefined(item);
        await setDoc(docRef, sanitized);
      }
      return seedData;
    } else {
      return snapshot.docs.map(doc => doc.data());
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
    return seedData;
  }
}

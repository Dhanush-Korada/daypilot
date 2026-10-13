import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { UserTemplate } from '../types';

export async function getUserTemplates(uid: string): Promise<UserTemplate[]> {
  const path = `users/${uid}/userTemplates`;
  try {
    const templatesRef = collection(db, 'users', uid, 'userTemplates');
    const q = query(templatesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => docSnap.data() as UserTemplate);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createUserTemplate(
  uid: string,
  name: string,
  templateData: Record<string, unknown>,
  type: 'task' | 'habit' | 'routine' = 'task'
): Promise<UserTemplate> {
  const templateId = 'tpl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `users/${uid}/userTemplates/${templateId}`;
  try {
    const docRef = doc(db, 'users', uid, 'userTemplates', templateId);
    const newTemplate: UserTemplate = {
      id: templateId,
      userId: uid,
      name: name.trim(),
      type,
      templateData,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, newTemplate);
    return newTemplate;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteUserTemplate(uid: string, templateId: string): Promise<void> {
  const path = `users/${uid}/userTemplates/${templateId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'userTemplates', templateId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

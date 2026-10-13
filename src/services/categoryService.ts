import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { handleFirestoreError, OperationType } from './errorHandler';
import { Category } from '../types';

export const BUILT_IN_CATEGORIES = [
  { name: 'Workout & Fitness', icon: 'Dumbbell', color: '#10b981' },
  { name: 'Reading & Books', icon: 'BookOpen', color: '#6366f1' },
  { name: 'Study & Learning', icon: 'GraduationCap', color: '#3b82f6' },
  { name: 'Work & Business', icon: 'Briefcase', color: '#f59e0b' },
  { name: 'Health & Personal Care', icon: 'Heart', color: '#ec4899' },
  { name: 'Family & Friends', icon: 'Users', color: '#8b5cf6' },
  { name: 'Birthdays & Special Events', icon: 'Cake', color: '#f43f5e' },
  { name: 'Daily Habits', icon: 'Flame', color: '#06b6d4' },
  { name: 'Other', icon: 'Tag', color: '#64748b' },
];

export async function seedDefaultCategories(uid: string): Promise<void> {
  const categoriesRef = collection(db, 'users', uid, 'categories');
  const path = `users/${uid}/categories`;
  try {
    const existing = await getDocs(categoriesRef);
    if (!existing.empty) {
      return; // already seeded
    }

    for (let i = 0; i < BUILT_IN_CATEGORIES.length; i++) {
      const item = BUILT_IN_CATEGORIES[i];
      // Generate clean deterministic ID
      const safeId = 'cat_' + item.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const docRef = doc(db, 'users', uid, 'categories', safeId);
      const catData: Category = {
        id: safeId,
        userId: uid,
        name: item.name,
        icon: item.icon,
        color: item.color,
        isBuiltIn: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(docRef, catData);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getCategories(uid: string): Promise<Category[]> {
  const path = `users/${uid}/categories`;
  try {
    const categoriesRef = collection(db, 'users', uid, 'categories');
    const q = query(categoriesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => docSnap.data() as Category);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function createCategory(uid: string, category: Omit<Category, 'id' | 'userId' | 'createdAt'>): Promise<Category> {
  const safeId = 'cat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `users/${uid}/categories/${safeId}`;
  try {
    const docRef = doc(db, 'users', uid, 'categories', safeId);
    const newCategory: Category = {
      id: safeId,
      userId: uid,
      name: category.name.trim(),
      icon: category.icon || 'Tag',
      color: category.color || '#64748b',
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
    };
    await setDoc(docRef, newCategory);
    return newCategory;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateCategory(uid: string, categoryId: string, updates: Partial<Pick<Category, 'name' | 'color' | 'icon'>>): Promise<void> {
  const path = `users/${uid}/categories/${categoryId}`;
  try {
    const docRef = doc(db, 'users', uid, 'categories', categoryId);
    await updateDoc(docRef, {
      ...updates,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteCategory(uid: string, categoryId: string): Promise<void> {
  const path = `users/${uid}/categories/${categoryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

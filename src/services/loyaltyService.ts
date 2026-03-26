import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  addDoc,
  query,
  where,
  getDocs,
  orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { LoyaltyTransaction, UserProfile } from '../types';

const LOYALTY_EARN_RATE = 0.1; // 10% of total as points
const LOYALTY_REDEEM_VALUE = 1; // 1 point = 1 unit of currency (e.g., $1)

export const loyaltyService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
    }
    return null;
  },

  async getLoyaltyTransactions(uid: string): Promise<LoyaltyTransaction[]> {
    const q = query(
      collection(db, 'loyaltyTransactions'),
      where('uid', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LoyaltyTransaction));
  },

  async awardPoints(uid: string, amount: number, referenceId: string, description: string) {
    const points = Math.floor(amount * LOYALTY_EARN_RATE);
    if (points <= 0) return;

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      loyaltyPoints: increment(points)
    });

    await addDoc(collection(db, 'loyaltyTransactions'), {
      uid,
      type: 'Earned',
      amount: points,
      description,
      referenceId,
      createdAt: serverTimestamp()
    });

    return points;
  },

  async redeemPoints(uid: string, points: number, referenceId: string, description: string) {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) throw new Error('User not found');
    const currentPoints = userSnap.data().loyaltyPoints || 0;
    
    if (currentPoints < points) throw new Error('Insufficient points');

    await updateDoc(userRef, {
      loyaltyPoints: increment(-points)
    });

    await addDoc(collection(db, 'loyaltyTransactions'), {
      uid,
      type: 'Redeemed',
      amount: points,
      description,
      referenceId,
      createdAt: serverTimestamp()
    });

    return points * LOYALTY_REDEEM_VALUE;
  }
};

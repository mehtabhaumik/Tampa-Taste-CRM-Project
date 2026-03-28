import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  OAuthProvider,
  PhoneAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup, 
  signInAnonymously,
  signOut, 
  onAuthStateChanged, 
  User 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const appleProvider = new OAuthProvider('apple.com');
export const microsoftProvider = new OAuthProvider('microsoft.com');

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Full Firestore Error Object:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  // Log the detailed error for debugging
  console.error('Detailed Firestore Error:', JSON.stringify(errInfo));

  // Determine a user-friendly message
  let friendlyMessage = "An unexpected database error occurred. Please try again.";
  
  if (errorMessage.includes('permission-denied') || errorMessage.includes('insufficient permissions')) {
    friendlyMessage = `Access Denied: You don't have permission to ${operationType} data at ${path || 'this location'}. Please ensure you are logged in with the correct account.`;
  } else if (errorMessage.includes('not-found')) {
    friendlyMessage = `Data Not Found: The requested information at ${path || 'this location'} could not be located.`;
  } else if (errorMessage.includes('unavailable')) {
    friendlyMessage = "Service Unavailable: The database is currently offline or unreachable. Please check your internet connection.";
  } else if (errorMessage.includes('quota-exceeded')) {
    friendlyMessage = "Quota Exceeded: The daily limit for database operations has been reached. Please try again tomorrow.";
  }

  // Create a new error with the friendly message but attach the details
  const enhancedError = new Error(friendlyMessage);
  (enhancedError as any).details = errInfo;
  throw enhancedError;
}

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
    // Skip logging for other errors, as this is simply a connection test.
  }
}
testConnection();

export { signInWithPopup, signInAnonymously, signOut, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber };
export type { User };

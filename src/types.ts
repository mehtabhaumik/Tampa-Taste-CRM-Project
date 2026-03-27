export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: 'Appetizer' | 'Main' | 'Dessert' | 'Drink';
  available: boolean;
  image?: string;
}

export interface Booking {
  id: string;
  uid?: string;
  customerName: string;
  customerEmail: string;
  phoneNumber?: string;
  tableNumber: number;
  date: string;
  time: string;
  guests: number;
  status: 'Confirmed' | 'Completed' | 'Cancelled' | 'Fulfilled';
  orderedItems: { itemId: string; quantity: number }[];
  pointsEarned?: number;
  pointsRedeemed?: number;
  rating?: number;
  comment?: string;
  createdAt: any; // Firestore Timestamp
}

export interface Table {
  number: number;
  capacity: number;
  status: 'Available' | 'Reserved' | 'Occupied';
}

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Chef' | 'Waiter' | 'Accountant' | 'Customer';

export interface UserProfile {
  uid: string;
  email: string;
  roles: UserRole[];
  loyaltyPoints?: number;
  employeeCode?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  phoneNumber?: string;
}

export interface LoyaltyTransaction {
  id: string;
  uid: string;
  type: 'Earned' | 'Redeemed';
  amount: number;
  description: string;
  referenceId?: string;
  createdAt: any;
}

export interface Feedback {
  id: string;
  uid?: string;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt: any;
}

export interface WaitlistEntry {
  id: string;
  customerName: string;
  partySize: number;
  phoneNumber?: string;
  status: 'Waiting' | 'Notified' | 'Seated' | 'Cancelled';
  estimatedWaitTime?: number;
  createdAt: any;
}

export interface Order {
  id: string;
  uid?: string;
  customerName: string;
  customerEmail: string;
  phoneNumber: string;
  address: string;
  items: { itemId: string; quantity: number }[];
  total: number;
  paymentMethod: 'Cash' | 'Credit Card';
  cardDetails?: {
    number: string;
    expiry: string;
    cvv: string;
  };
  status: 'Pending' | 'Preparing' | 'Out for Delivery' | 'Delivered' | 'Cancelled' | 'Fulfilled';
  pointsEarned?: number;
  pointsRedeemed?: number;
  createdAt: any;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  employeeCode: string;
  designation: string;
  roles: UserRole[];
  active: boolean;
  createdBy?: string;
  createdAt?: any;
}

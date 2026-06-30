export const ISSUE_CATEGORIES = [
  { id: "Air Pollution", icon: "💨", label: "Air Pollution", imageUrl: "/assets/categories/air_pollution.png" },
  { id: "Pothole", icon: "🕳️", label: "Pothole", imageUrl: "/assets/categories/pothole.png" },
  { id: "Water Pollution", icon: "💧", label: "Water Pollution", imageUrl: "/assets/categories/water_pollution.png" },
  { id: "Garbage", icon: "🗑️", label: "Garbage/Waste", imageUrl: "/assets/categories/garbage.png" },
  { id: "Infrastructure", icon: "🏗️", label: "Infrastructure", imageUrl: "/assets/categories/infrastructure.png" },
  { id: "Noise", icon: "🔊", label: "Noise", imageUrl: "/assets/categories/noise.png" },
  { id: "Other", icon: "❓", label: "Other", imageUrl: "/assets/categories/infrastructure.png" } // Fallback to infra
];

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export type IssueStatus = "reported" | "verified" | "in_progress" | "resolved" | "revoked";
export type IssueSeverity = "Low" | "Medium" | "High" | "Critical";

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: number;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: IssueSeverity;
  status: IssueStatus;
  location: Location;
  imageUrl?: string;
  icon?: string;
  tags: string[];
  reportedBy: string; // user ID
  reportedAt: any; // timestamp or Firestore Timestamp
  upvotes: number; // Keep for backward compatibility/sorting
  upvotedBy?: string[]; // Array of user UIDs who upvoted
  verifications: number; // Keep for backward compatibility
  verifiedBy?: string[]; // Array of user UIDs who verified
  revokedBy?: string; // Name of the user who revoked it
  revokedAt?: any;
  revokeReason?: string;
  views?: number; // Track how many times this issue was viewed
  comments?: Comment[];
  mediaUrl?: string; // Keep for backward compatibility
  mediaUrls?: string[]; // Array of multiple media files (Base64)
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  gender?: string;
  age?: number | string;
  mobileNumber?: string;
  phoneVerified?: boolean;
  score: number;
  issuesReported: number;
  issuesVerified: number;
}

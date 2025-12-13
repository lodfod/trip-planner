export type GroupMember = {
  id: string;
  full_name: string;
  display_name?: string;
  email: string;
  avatar_url?: string;
  isPending?: boolean; // True if this is an invited but not yet signed up member
  is_active?: boolean; // False if user has left the trip
};

// Pending member - invited but hasn't signed up yet
export interface PendingMember {
  id: string;
  email: string;
  display_name: string;
  invited_by: string;
  created_at: string;
}

export interface Expense {
  id: string;
  expenseName: string;
  creatorName: string;
  cost: number;
  date: string;
  category: string;
  location: string;
  payers: ProcessedPayer[];
  receipt_url?: string;
  creator: string;
  original_currency: Currency;
  original_amount: number;
  exchange_rate_used?: number;
  event_id?: string;
}

export interface ExpenseItem {
  name: string;
  cost: number;
  location: string;
  category: string;
  payers: string[];
  creator: string;
  receipt_url?: string;
  original_currency: Currency;
  original_amount: number;
  exchange_rate_used?: number;
  event_id?: string;
}

export type Payer = {
  id: string;
  full_name: string;
  email: string;
  amount: number;
  isCreator: boolean;
};

export interface PayerAmount {
  expense_id: string;
  user_id?: string;
  pending_member_id?: string;
  amount: number;
  original_amount?: number;
}

export interface ProcessedPayer {
  id: string;
  full_name: string;
  amount: number;
  isPending?: boolean;
}

export interface ProcessedExpense {
  id: string;
  expenseName: string;
  creatorName: string;
  cost: number;
  date: string;
  category: string;
  location: string;
  payers: ProcessedPayer[];
  receipt_url?: string;
  original_currency: Currency;
  original_amount: number;
  creator: string;
  exchange_rate_used?: number;
  event_id?: string;
}

// Changed from EUR to JPY for Japan trip
export type Currency = "JPY" | "USD";

// ============================================
// ITINERARY TYPES (Advanced Trip Planning)
// ============================================

export type ParticipationStatus = "going" | "maybe" | "not_going";

export type StopCategory =
  | "food"
  | "temple"
  | "shrine"
  | "shopping"
  | "activity"
  | "transport"
  | "hotel"
  | "scenic"
  | "museum"
  | "entertainment"
  | "other";

export type TravelMode = "walking" | "transit" | "driving";

// Opening hours structure from Google Places
export interface GoogleOpeningHours {
  open_now?: boolean;
  periods?: {
    open: { day: number; time: string };
    close?: { day: number; time: string };
  }[];
  weekday_text?: string[];
}

// A mini-itinerary is a collection of stops for a subgroup
export interface Itinerary {
  id: string;
  name: string;
  description?: string;
  date: string;
  color: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface ItineraryWithDetails extends Itinerary {
  stops: ItineraryStopWithDetails[];
  participants: ItineraryParticipant[];
  creator_profile?: {
    full_name: string;
    display_name?: string;
  };
}

// A stop is a place/activity that can be shared across itineraries
export interface Stop {
  id: string;
  name: string;
  description?: string;
  address?: string;
  lat?: number;
  lng?: number;
  google_place_id?: string;
  estimated_duration_minutes?: number;
  category: StopCategory;
  opening_hours?: GoogleOpeningHours;
  photo_url?: string;
  phone?: string;
  website?: string;
  price_level?: number;
  rating?: number;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

// Junction between itinerary and stop with ordering
export interface ItineraryStop {
  id: string;
  itinerary_id: string;
  stop_id: string;
  stop_order: number;
  planned_arrival_time?: string;
  planned_departure_time?: string;
  notes?: string;
  is_optional: boolean;
}

export interface ItineraryStopWithDetails extends ItineraryStop {
  stop: Stop;
  travel_from_previous?: RouteSegment;
}

// Who's going on this itinerary
export interface ItineraryParticipant {
  id: string;
  itinerary_id: string;
  user_id: string;
  status: ParticipationStatus;
  can_edit: boolean; // Whether this participant can add/remove/reorder stops
  profile?: {
    full_name: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// Cached route data between stops
export interface RouteSegment {
  id?: string;
  from_stop_id: string;
  to_stop_id: string;
  travel_mode: TravelMode;
  duration_seconds?: number;
  distance_meters?: number;
  route_polyline?: string;
  route_summary?: string;
  route_data?: google.maps.DirectionsResult;
  fetched_at?: string;
}

// Route optimization output
export interface OptimizedRoute {
  stops: OptimizedStop[];
  totalDurationMinutes: number;
  totalWalkingMinutes: number;
  totalTransitMinutes: number;
  warnings: string[];
}

export interface OptimizedStop {
  stop: Stop;
  arrivalTime: string;
  departureTime: string;
  travelFromPrevious?: RouteSegment;
}

// Shared stop info
export interface SharedStopInfo {
  stop_id: string;
  stop_name: string;
  itinerary_ids: string[];
  itinerary_names: string[];
  itinerary_count: number;
}

// Legacy Event types (keeping for backwards compatibility during migration)
export interface Event {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  event_time?: string;
  location?: string;
  address?: string;
  google_maps_url?: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface EventWithParticipants extends Event {
  participants: EventParticipant[];
  creator_profile?: {
    full_name: string;
    display_name?: string;
  };
}

export interface EventParticipant {
  id: string;
  event_id: string;
  user_id: string;
  status: ParticipationStatus;
  profile?: {
    full_name: string;
    display_name?: string;
    avatar_url?: string;
  };
}

// ============================================
// RECEIPT OCR TYPES
// ============================================

export interface ReceiptItem {
  name: string;
  price: number;
  quantity?: number;
}

export interface ParsedReceipt {
  items: ReceiptItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total: number;
  currency: Currency;
  merchantName?: string;
  date?: string;
}

export interface ItemAssignment {
  itemIndex: number;
  userIds: string[];
}

// ============================================
// LISTS TYPES (Place Collections)
// ============================================

export type ListCategory = 'restaurants' | 'shopping' | 'activities' | 'sightseeing' | 'custom';

export interface List {
  id: string;
  name: string;
  description?: string;
  category: ListCategory;
  color: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
  creator_profile?: {
    full_name: string;
    display_name?: string;
  };
  items?: ListItem[];
}

export interface ListItem {
  id: string;
  list_id: string;
  parent_item_id?: string;
  name: string;
  notes?: string;
  item_order: number;
  is_checked: boolean;
  checked_by?: string;
  checked_at?: string;
  // Google Maps place data (null if just text)
  is_place: boolean;
  google_place_id?: string;
  address?: string;
  lat?: number;
  lng?: number;
  photo_url?: string;
  rating?: number;
  price_level?: number;
  // Metadata
  created_by: string;
  created_at: string;
  // Nested items (populated when fetched)
  children?: ListItem[];
  checked_profile?: {
    full_name: string;
    display_name?: string;
  };
}

export type AvailabilityRule = {
  id: string;
  staff_member_id: string;
  location_id: string | null;
  weekday: number; // 0=Sun, 1=Mon, ..., 6=Sat
  start_local: string; // "HH:MM"
  end_local: string;   // "HH:MM"
  is_available: boolean;
};

export type AvailabilityStaffMember = {
  id: string;
  full_name: string;
  role: string;
};

export type AvailabilityLocation = {
  id: string;
  name: string;
};

export type ServiceRecord = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_from: number;
  currency: string;
  is_bookable: boolean;
  status: string;
  location_id: string | null;
  category_id: string | null;
};

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

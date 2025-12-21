-- Create enum types for the platform
CREATE TYPE public.user_type AS ENUM ('store', 'ad_sponsor', 'admin');
CREATE TYPE public.store_category AS ENUM (
  'restaurant', 'retail', 'grocery', 'pharmacy', 'salon', 
  'gym', 'medical', 'automotive', 'entertainment', 'other'
);
CREATE TYPE public.ad_category AS ENUM (
  'food', 'retail', 'health', 'beauty', 'automotive', 
  'entertainment', 'technology', 'real_estate', 'services', 'other'
);
CREATE TYPE public.order_status AS ENUM ('pending', 'approved', 'rejected', 'active', 'completed', 'cancelled');
CREATE TYPE public.package_type AS ENUM ('monthly', 'yearly');
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Profiles table for all users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  user_type user_type NOT NULL DEFAULT 'store',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- User roles table (for admin access)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  store_name TEXT NOT NULL,
  store_type store_category NOT NULL DEFAULT 'other',
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'USA',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  opening_time TIME NOT NULL DEFAULT '09:00',
  closing_time TIME NOT NULL DEFAULT '21:00',
  ad_categories ad_category[] NOT NULL DEFAULT '{}',
  bank_account_name TEXT,
  bank_account_number TEXT,
  bank_routing_number TEXT,
  is_active BOOLEAN DEFAULT false,
  tv_device_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Store default content (videos/images to play when no ads)
CREATE TABLE public.store_default_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image', 'youtube')),
  content_url TEXT NOT NULL,
  title TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ad Sponsors (Companies posting ads)
CREATE TABLE public.ad_sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  company_type TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'USA',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ad Packages
CREATE TABLE public.ad_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  store_count INTEGER NOT NULL,
  package_type package_type NOT NULL,
  price_cents INTEGER NOT NULL,
  ad_changes_included INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Ads (the actual ad content)
CREATE TABLE public.ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.ad_sponsors(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category ad_category NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('video', 'image', 'youtube')),
  content_url TEXT NOT NULL,
  duration_seconds INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Orders (ad placements)
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID REFERENCES public.ad_sponsors(id) ON DELETE CASCADE NOT NULL,
  ad_id UUID REFERENCES public.ads(id) ON DELETE SET NULL,
  package_id UUID REFERENCES public.ad_packages(id) NOT NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price_cents INTEGER NOT NULL,
  payment_intent_id TEXT,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Order Stores (stores included in an order)
CREATE TABLE public.order_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  status order_status DEFAULT 'pending' NOT NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  UNIQUE (order_id, store_id)
);

-- Ad Schedule (when ads play on which stores)
CREATE TABLE public.ad_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  ad_id UUID REFERENCES public.ads(id) ON DELETE CASCADE NOT NULL,
  scheduled_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Payments tracking
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  payment_type TEXT NOT NULL CHECK (payment_type IN ('sponsor_payment', 'store_payout')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  stripe_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_default_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_roles (admin only)
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stores
CREATE POLICY "Store owners can manage their store" ON public.stores
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Active stores are viewable by authenticated users" ON public.stores
  FOR SELECT TO authenticated USING (is_active = true);

-- RLS Policies for store_default_content
CREATE POLICY "Store owners can manage their content" ON public.store_default_content
  FOR ALL USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));

-- RLS Policies for ad_sponsors
CREATE POLICY "Sponsors can manage their account" ON public.ad_sponsors
  FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for ad_packages (public read)
CREATE POLICY "Anyone can view active packages" ON public.ad_packages
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage packages" ON public.ad_packages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for ads
CREATE POLICY "Sponsors can manage their ads" ON public.ads
  FOR ALL USING (sponsor_id IN (SELECT id FROM public.ad_sponsors WHERE user_id = auth.uid()));
CREATE POLICY "Active ads viewable by stores" ON public.ads
  FOR SELECT TO authenticated USING (is_active = true);

-- RLS Policies for orders
CREATE POLICY "Sponsors can view their orders" ON public.orders
  FOR SELECT USING (sponsor_id IN (SELECT id FROM public.ad_sponsors WHERE user_id = auth.uid()));
CREATE POLICY "Sponsors can create orders" ON public.orders
  FOR INSERT WITH CHECK (sponsor_id IN (SELECT id FROM public.ad_sponsors WHERE user_id = auth.uid()));

-- RLS Policies for order_stores
CREATE POLICY "Store owners can view orders for their store" ON public.order_stores
  FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Store owners can update order status" ON public.order_stores
  FOR UPDATE USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Sponsors can view their order stores" ON public.order_stores
  FOR SELECT USING (order_id IN (
    SELECT id FROM public.orders WHERE sponsor_id IN (
      SELECT id FROM public.ad_sponsors WHERE user_id = auth.uid()
    )
  ));

-- RLS Policies for ad_schedule
CREATE POLICY "Stores can view their schedule" ON public.ad_schedule
  FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Public read for active schedules" ON public.ad_schedule
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for payments
CREATE POLICY "Store owners can view their payouts" ON public.payments
  FOR SELECT USING (store_id IN (SELECT id FROM public.stores WHERE user_id = auth.uid()));
CREATE POLICY "Sponsors can view their payments" ON public.payments
  FOR SELECT USING (order_id IN (
    SELECT id FROM public.orders WHERE sponsor_id IN (
      SELECT id FROM public.ad_sponsors WHERE user_id = auth.uid()
    )
  ));

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    COALESCE((NEW.raw_user_meta_data ->> 'user_type')::user_type, 'store')
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON public.stores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ad_sponsors_updated_at BEFORE UPDATE ON public.ad_sponsors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ads_updated_at BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default packages
INSERT INTO public.ad_packages (name, description, store_count, package_type, price_cents, ad_changes_included) VALUES
('1 Store Monthly', '15 second ads every 30 mins in 1 store', 1, 'monthly', 8900, 1),
('1 Store Yearly', '15 second ads every 30 mins in 1 store for 1 year', 1, 'yearly', 65000, 2),
('5 Stores Monthly', '15 second ads every 30 mins in 5 stores', 5, 'monthly', 40000, 2),
('5 Stores Yearly', '15 second ads every 30 mins in 5 stores for 1 year', 5, 'yearly', 350000, 4),
('30 Stores Monthly', '15 second ads every 30 mins in 30 stores', 30, 'monthly', 200000, 5),
('30 Stores Yearly', '15 second ads every 30 mins in 30 stores for 1 year', 30, 'yearly', 2000000, 10);

-- Enable realtime for ad_schedule (for TV app updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_schedule;
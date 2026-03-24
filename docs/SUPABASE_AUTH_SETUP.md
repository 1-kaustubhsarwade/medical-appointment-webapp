# Supabase Auth Setup Guide — MediBook

This guide covers **every Supabase configuration step** needed for the remodelled authentication system (patients, doctors, single admin).

---

## 1. Environment Variables

Create a `.env.local` file in the project root (if it doesn't exist already):

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key (keep secret!) |

> **Never** expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code. It is only used in API route handlers on the server.

---

## 2. Database Tables

Run the following SQL in **Supabase Dashboard → SQL Editor**:

### `users_extended` table

```sql
CREATE TABLE IF NOT EXISTS public.users_extended (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users_extended ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users_extended FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users_extended FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (registration)
CREATE POLICY "Users can insert own profile"
  ON public.users_extended FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### `doctors` table

```sql
CREATE TABLE IF NOT EXISTS public.doctors (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  specialization TEXT NOT NULL,
  degree TEXT,
  experience_years INT,
  consultation_fee NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

-- Anyone can read doctors (for booking)
CREATE POLICY "Public can read doctors"
  ON public.doctors FOR SELECT
  USING (true);

-- Doctors can update their own row
CREATE POLICY "Doctors can update own row"
  ON public.doctors FOR UPDATE
  USING (auth.uid() = id);

-- Doctors can insert their own row (registration)
CREATE POLICY "Doctors can insert own row"
  ON public.doctors FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### `appointments` table

```sql
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  doctor_id UUID NOT NULL REFERENCES public.doctors(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Patients can read their own appointments
CREATE POLICY "Patients can read own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = patient_id);

-- Doctors can read appointments assigned to them
CREATE POLICY "Doctors can read own appointments"
  ON public.appointments FOR SELECT
  USING (auth.uid() = doctor_id);

-- Authenticated users can insert appointments
CREATE POLICY "Auth users can insert appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Doctors can update their own appointments (confirm/cancel)
CREATE POLICY "Doctors can update own appointments"
  ON public.appointments FOR UPDATE
  USING (auth.uid() = doctor_id);
```

> **Guest bookings** (where `patient_id` is `NULL`) are read via the **service role key** in API routes, so they bypass RLS automatically.

---

## 3. Create the Single Admin Account

The admin account is **not registered through the app**. Instead, seed it directly in Supabase.

### Option A — Via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard → Authentication → Users**
2. Click **Add User → Create New User**
3. Fill in:
   - **Email**: Your admin email (e.g. `admin@medibook.com`)
   - **Password**: A strong password
   - **Auto Confirm User**: ✅ Toggle ON
4. After the user is created, copy the user's **UUID** from the user list
5. Go to **SQL Editor** and run:

```sql
-- Replace <ADMIN_UUID> and <ADMIN_EMAIL> with actual values
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE id = '<ADMIN_UUID>';

INSERT INTO public.users_extended (id, full_name, phone, role)
VALUES ('<ADMIN_UUID>', 'System Administrator', NULL, 'admin');
```

### Option B — Via SQL Only

```sql
-- Create admin user (Supabase's auth.users insert requires service role or dashboard)
-- Use SQL Editor with service_role context:

-- Step 1: Create the user via Dashboard (see Option A steps 1-4)
-- Step 2: Then set metadata and profile:

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"admin"'
)
WHERE email = 'admin@medibook.com';

INSERT INTO public.users_extended (id, full_name, role)
SELECT id, 'System Administrator', 'admin'
FROM auth.users
WHERE email = 'admin@medibook.com';
```

### Option C — Via Supabase Client (One-time Script)

You can also run a one-time Node.js script using the service role key:

```js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://<your-project>.supabase.co',
  '<your-service-role-key>'
)

const { data, error } = await supabase.auth.admin.createUser({
  email: 'admin@medibook.com',
  password: 'your-secure-password',
  email_confirm: true,
  user_metadata: { role: 'admin', full_name: 'System Administrator' }
})

if (data?.user) {
  await supabase.from('users_extended').insert({
    id: data.user.id,
    full_name: 'System Administrator',
    role: 'admin'
  })
  console.log('Admin created:', data.user.id)
} else {
  console.error('Error:', error)
}
```

---

## 4. Auth Settings (Supabase Dashboard)

Go to **Supabase Dashboard → Authentication → Settings**:

| Setting | Recommended Value |
|---|---|
| **Enable email confirmations** | ON (production) or OFF (development) |
| **Site URL** | `http://localhost:3000` (dev) or your production URL |
| **Redirect URLs** | Add: `http://localhost:3000/api/auth/callback` and your production callback URL |
| **Minimum password length** | 6 |
| **Enable sign up** | ON |

### Email Templates (Optional)

Under **Authentication → Email Templates**, you can customize the confirmation email. The default works fine.

---

## 5. How the Auth System Works

### Roles

| Role | Registration | Login | Dashboard |
|---|---|---|---|
| **Patient** | ✅ Via `/register?role=patient` | ✅ Via `/login` (Patient tab) | `/patient-dashboard` |
| **Doctor** | ✅ Via `/register?role=doctor` | ✅ Via `/login` (Doctor tab) | `/doctor-dashboard` |
| **Admin** | ❌ No registration (seeded in DB) | ✅ Via `/login` (Admin tab) | `/admin-dashboard` |

### Auth Flow

1. **Login**: User selects their role tab → enters email/password → app validates the role in `user_metadata.role` matches the selected tab → redirects to appropriate dashboard
2. **Registration**: Patient or Doctor fills the form → `supabase.auth.signUp()` with `user_metadata.role` → profile inserted in `users_extended` (+ `doctors` table for doctors) → redirected to dashboard
3. **Admin Login**: Admin selects Admin tab → enters pre-seeded credentials → app checks `/api/admin/exists` to confirm admin exists → validates role → redirects to `/admin-dashboard`
4. **Session Protection**: `RequireAuth` component wraps all dashboard pages. If no session → redirect to login. If patient/doctor with no profile → redirect to register. Admin skips profile check.
5. **Session Polling**: `AuthContext` polls session every 60s and on window focus. If session is removed server-side, user is auto-logged out.

### Single Admin Enforcement

- The `/api/admin/exists` endpoint checks if an admin account exists in Supabase auth
- The login page uses this to show an "Admin not configured" message if no admin is seeded
- The registration page does **not** offer an admin role option at all
- Only one admin can exist; to change admin, delete the current one from admin dashboard and re-seed

---

## 6. Troubleshooting

| Issue | Solution |
|---|---|
| "Invalid session token" on admin actions | Ensure `SUPABASE_SERVICE_ROLE_KEY` is set correctly in `.env.local` |
| Admin can't login | Ensure admin was created with `user_metadata.role = 'admin'` (see Step 3) |
| "Role mismatch" on login | The selected tab must match the user's `user_metadata.role` in Supabase |
| Registration fails silently | Check browser console; ensure `users_extended` table exists with correct columns |
| Guest bookings not showing | Guest lookup uses service role key; ensure `SUPABASE_SERVICE_ROLE_KEY` is valid |
| Session lost after refresh | This is expected if Supabase cookies expired; `RequireAuth` gives a 1.5s grace period on reload |

---

## 7. Summary of Supabase Changes Required

If you already had the old system running:

1. **No schema changes** — the tables remain the same
2. **Seed admin account** — follow Step 3 above (most important change)
3. **Verify `user_metadata.role`** — ensure all existing users have the correct role in their metadata
4. **Check redirect URLs** — ensure `http://localhost:3000/api/auth/callback` is in your Supabase redirect URLs list

That's it! The app code handles everything else.

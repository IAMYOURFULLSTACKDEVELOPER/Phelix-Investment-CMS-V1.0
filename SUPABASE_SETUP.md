# Supabase Setup Guide for Phelix Investment CMS

## 🚨 **Current Issue**
Your current Supabase URL (`https://utlgnmmksguhvnajsuom.supabase.co`) is not accessible, which is causing the "Failed to fetch" errors.

## 📋 **Step-by-Step Setup**

### 1. **Create or Access Your Supabase Project**
1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sign in or create an account
3. Create a new project (or use an existing one)
4. Wait for the project to be ready (usually 1-2 minutes)

### 2. **Get Your Project Credentials**
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`)
3. Copy the **anon** / **public** key

### 3. **Update Your .env File**
Replace the contents of your `.env` file with your actual credentials:

```env
VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key
```

### 4. **Run the Database Schema**
1. In Supabase dashboard, go to **SQL Editor**
2. Create a new query
3. Copy and run the contents of `supabase/01_schema.sql`
4. This will create all necessary tables, functions, and triggers

### 5. **Configure Email Authentication**
1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Ensure **Email** provider is enabled
3. For testing, you can disable **Confirm email** (Settings → Authentication → Email confirmation)
4. This allows immediate account creation without email verification

### 6. **Test the Connection**
1. Restart your dev server: `npm run dev`
2. Open `http://localhost:5173/test-supabase.html`
3. Click "Test Connection" to verify connectivity
4. If successful, try the "Test Signup" button

### 7. **Create Your Admin Account**
Once everything is working:
1. Use the registration form to create an account
2. Or manually create via Supabase Dashboard → Authentication → Users
3. For Mr Phelix's account:
   - Email: `phelixinvestment@gmail.com`
   - Password: `@1Phelix232`
   - Role: `super_admin`

## 🔧 **Troubleshooting**

### If you still get "Failed to fetch":
1. **Check your internet connection**
2. **Verify the Supabase URL is correct** (copy it directly from dashboard)
3. **Check if Supabase services are down** (status.supabase.com)
4. **Try a different network** (if on corporate network)
5. **Check browser console** (F12) for detailed error messages

### If signup fails but connection works:
1. **Check Authentication settings** in Supabase dashboard
2. **Ensure email auth is enabled**
3. **Check if email confirmation is required** (disable for testing)
4. **Review database logs** in Supabase dashboard

### If you see database errors:
1. **Ensure the schema SQL was run successfully**
2. **Check if tables exist** in Supabase dashboard → Table Editor
3. **Review the SQL execution logs** for any errors

## 📝 **Important Notes**

- The current Supabase URL in your `.env` file appears to be invalid or inaccessible
- You need to replace it with your actual working Supabase project URL
- The schema SQL file must be run in your Supabase project for the app to work
- Email confirmation can be disabled for development/testing purposes

## ✅ **Verification Checklist**

- [ ] Supabase project created and accessible
- [ ] `.env` file updated with correct credentials
- [ ] Database schema (`01_schema.sql`) executed successfully
- [ ] Email authentication enabled in Supabase
- [ ] Test connection shows success
- [ ] Can create account via registration form
- [ ] Can sign in with created credentials
- [ ] Profile created automatically in database
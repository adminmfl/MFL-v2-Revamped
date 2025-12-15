import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { getSupabaseServiceRole } from "@/lib/supabase/client";
import bcrypt from 'bcryptjs';
// Use bcryptjs to compare hashed passwords

const authOptions = {
  session: {
    strategy: "jwt" as const,
    // Keep sessions reasonably long and avoid frequent token rotation
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  // Disable verbose NextAuth debug in development to avoid noisy logs.
  // Set to `true` only when actively diagnosing auth flows.
  debug: false,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = (credentials?.email || "").trim().toLowerCase();
        const password = String(credentials?.password || "");
        // Minimal logging: avoid spamming logs on every authorize attempt
        if (!email || !password) return null;
        try {
          // Use service role to bypass RLS during login (user not authenticated yet)
          const { data: user, error: uErr } = await getSupabaseServiceRole()
            .from("users")
            .select("user_id, username, password_hash, email, platform_role")
            .eq("email", email)
            .maybeSingle();

          // DEBUG: Log what we got from database
          console.log('[AUTH DEBUG] Email lookup:', email);
          console.log('[AUTH DEBUG] User found:', user ? 'YES' : 'NO');
          if (uErr) console.error('[AUTH DEBUG] Supabase error:', uErr.message || uErr);
          if (user) console.log('[AUTH DEBUG] User data:', {
            user_id: (user as any).user_id,
            email: (user as any).email,
            platform_role: (user as any).platform_role,
            has_password: !!(user as any).password_hash
          });

          if (user && (user as any).password_hash) {
            const match = await bcrypt.compare(password, String((user as any).password_hash));
            console.log('[AUTH DEBUG] Password match:', match);
            if (match) {
              return {
                id: (user as any).user_id,
                name: (user as any).username,
                email: (user as any).email,
                platform_role: (user as any).platform_role || 'user'
              } as any;
            }
          }
        } catch (err) {
          console.error('Credentials authorize error:', err);
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      // signIn callback invoked; keep the implementation but avoid verbose logging
      try {
      // Allow credentials login
      if (account?.provider === "credentials") {
        return true;
      }
      
      // Handle Google OAuth
      if (account?.provider === "google" && profile?.email) {
        // Use service role to bypass RLS during OAuth (user not authenticated yet)
        const supabase = getSupabaseServiceRole();
        // Check if user exists with this email
        const { data: existingUser, error: existingError } = await supabase
          .from("users")
          .select("user_id, username, email, password_hash, platform_role")
          .eq("email", profile.email)
          .maybeSingle();
        if (existingError) console.error('Supabase lookup error', existingError);
        
        if (existingUser) {
          // User exists, update user object for JWT
          user.id = (existingUser as any).user_id;
          user.name = (existingUser as any).username;
          user.email = (existingUser as any).email;
          user.platform_role = (existingUser as any).platform_role || 'user';
          user.needsProfileCompletion = !((existingUser as any).password_hash);
          return true;
        } else {
          // New user - create account
          const username = profile.email.split('@')[0].toLowerCase();
          const { data: newUser, error } = await supabase
            .from("users")
            .insert({
              username: username,
              email: profile.email,
              password_hash: '', // Empty for OAuth users - needs completion
              platform_role: 'user', // Default to regular user
              is_active: true,
            })
            .select("user_id, username, email, platform_role")
            .single();

          if (error || !newUser) {
            console.error("Error creating OAuth user:", error);
            return false;
          }

          user.id = (newUser as any).user_id;
          user.name = (newUser as any).username;
          user.email = (newUser as any).email;
          user.platform_role = (newUser as any).platform_role || 'user';
          user.needsProfileCompletion = true;
          return true;
        }
      }
      } catch (err) {
        console.error('Error in NextAuth signIn callback', err);
        return false;
      }
    },
    async jwt({ token, user, trigger }: { token: any; user?: any; trigger?: string }) {
      // DEBUG: Log jwt callback
      console.log('[JWT DEBUG] Trigger:', trigger);
      console.log('[JWT DEBUG] User from authorize:', user);

      if (user) {
        (token as any).id = (user as any).id;
        (token as any).name = (user as any).name;
        (token as any).email = (user as any).email;
        (token as any).platform_role = (user as any).platform_role || 'user';
        (token as any).needsProfileCompletion = (user as any).needsProfileCompletion || false;
        console.log('[JWT DEBUG] Token after setting user data:', {
          id: token.id,
          email: token.email,
          platform_role: token.platform_role
        });
      }

      console.log('[JWT DEBUG] Final token platform_role:', (token as any).platform_role);
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      // DEBUG: Log session callback
      console.log('[SESSION DEBUG] Token received:', {
        id: (token as any)?.id,
        email: (token as any)?.email,
        platform_role: (token as any)?.platform_role
      });

      (session as any).user = {
        id: String((token as any)?.id || ""),
        name: String((token as any)?.name ?? ""),
        email: String((token as any)?.email ?? ""),
        platform_role: (token as any)?.platform_role || 'user',
        needsProfileCompletion: (token as any)?.needsProfileCompletion || false,
      };

      console.log('[SESSION DEBUG] Session.user after setting:', (session as any).user);
      return session;
    },
  },
} as const;

const handler = NextAuth(authOptions as any);
export { handler as GET, handler as POST };



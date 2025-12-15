import 'next-auth'
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name: string
      email: string
      platform_role: 'admin' | 'user'
      needsProfileCompletion: boolean
    } & DefaultSession['user']
  }

  interface User {
    id: string
    name: string
    email: string
    platform_role: 'admin' | 'user'
    needsProfileCompletion: boolean
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    name: string
    email: string
    platform_role: 'admin' | 'user'
    needsProfileCompletion: boolean
  }
}

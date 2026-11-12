import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from 'oidc-client-ts';
import { manager, roles } from './session';
const Context = createContext<{ user: User | null; groups: string[] }>({ user: null, groups: [] });
export function Auth({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const clear = () => setUser(null);
    void manager?.getUser().then(setUser);
    manager?.events.addUserLoaded(setUser); manager?.events.addUserUnloaded(clear); manager?.events.addAccessTokenExpired(clear);
    return () => { manager?.events.removeUserLoaded(setUser); manager?.events.removeUserUnloaded(clear); manager?.events.removeAccessTokenExpired(clear); };
  }, []);
  return <Context.Provider value={{ user, groups: roles(user) }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);

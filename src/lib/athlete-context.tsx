'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createClient } from './supabase';

interface AthleteCtx {
  athleteId: string | null;
  name: string;
  initials: string;
  focus: string;
  loading: boolean;
}

const AthleteContext = createContext<AthleteCtx>({
  athleteId: null, name: '', initials: '', focus: '', loading: true,
});

export function AthleteProvider({ children }: { children: ReactNode }) {
  const [ctx, setCtx] = useState<AthleteCtx>({
    athleteId: null, name: '', initials: '', focus: '', loading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setCtx(c => ({ ...c, loading: false })); return; }
      const { data } = await supabase
        .from('athletes')
        .select('id, name, initials, focus')
        .eq('user_id', user.id)
        .single();
      if (data) {
        setCtx({ athleteId: data.id, name: data.name, initials: data.initials, focus: data.focus, loading: false });
      } else {
        setCtx(c => ({ ...c, loading: false }));
      }
    });
  }, []);

  return <AthleteContext.Provider value={ctx}>{children}</AthleteContext.Provider>;
}

export function useAthlete() {
  return useContext(AthleteContext);
}

'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export interface CreateAthleteInput {
  email: string;
  password: string;
  name: string;
  initials: string;
  age: number;
  weeklyHours: number;
  focus: string;
  color: string;
}

export async function createAthlete(input: CreateAthleteInput) {
  const supabase = createAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: { role: 'athlete' },
  });

  if (authError) return { error: authError.message };

  const userId = authData.user.id;

  const { error: profileError } = await supabase
    .from('athletes')
    .insert({
      user_id:      userId,
      name:         input.name,
      initials:     input.initials,
      age:          input.age,
      weekly_hours: input.weeklyHours,
      focus:        input.focus,
      color:        input.color,
      status:       'on-track',
      adherence:    0,
      rpe7:         7.0,
    });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return { error: profileError.message };
  }

  revalidatePath('/athletes');
  revalidatePath('/dashboard');

  return { success: true };
}

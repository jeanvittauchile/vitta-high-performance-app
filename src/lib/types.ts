export type CategoryId =
  | 'traccion' | 'empuje' | 'zona_media' | 'arranque' | 'envion' | 'jerk'
  | 'pliometria_brazos' | 'pliometria_piernas' | 'lanzamientos'
  | 'aerobicos' | 'preventivos' | 'movilidad' | 'coordinacion';

export type LevelId = 'basico' | 'intermedio' | 'avanzado';

export type AthleteStatus = 'on-track' | 'peak' | 'deload' | 'missed';

export interface Category {
  id: CategoryId;
  label: string;
  short: string;
  color: string;
  iconKey: string;
}

export interface Level {
  id: LevelId;
  label: string;
  short: string;
  color: string;
  index: number;
}

export interface Exercise {
  id: string;
  name: string;
  category: CategoryId;
  level: LevelId;
  muscle: string;
  equipment: string;
  videoUrl?: string;
  cues?: string[];
}

export interface Athlete {
  id: string;
  name: string;
  initials: string;
  age: number;
  weeklyHours: number;
  focus: CategoryId;
  adherence: number;
  rpe7: number;
  status: AthleteStatus;
  color: string;
}

export interface SetSpec {
  r: number | string;
  l: number | string;
  rpe?: number;
  rest: string;
  done?: boolean;
  actualReps?: number;
  actualLoad?: number;
  actualRpe?: number;
}

export interface SessionExercise {
  id: string;
  exId: string;
  name: string;
  level: LevelId;
  note?: string;
  category?: CategoryId;
  sets: SetSpec[];
}

export interface SessionBlock {
  id: string;
  name: string;
  category: CategoryId;
  color: string;
  items: SessionExercise[];
}

export interface Session {
  id?: string;
  athleteId?: string;
  date?: string;
  title: string;
  block: string;
  duration: number;
  rpe_target: number;
  blocks: SessionBlock[];
}

export type DayType =
  | 'REST' | 'MOV' | 'EMP' | 'TRC' | 'ZM' | 'ARR' | 'ENV' | 'JRK'
  | 'PLB' | 'PLP' | 'LNZ' | 'AER' | 'PRV' | 'COR' | 'TEST' | 'DELOAD';

export type MonthPlan = DayType[][];

export interface Message {
  id: string;
  threadId: string;
  from: 'coach' | 'athlete';
  text: string;
  attachment?: { name: string; url: string; type: string };
  createdAt: string;
}

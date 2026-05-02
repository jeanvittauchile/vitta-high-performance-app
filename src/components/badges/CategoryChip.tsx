'use client';
import { CATEGORIES } from '@/lib/constants';
import { getCategoryIcon } from '@/components/icons';
import type { CategoryId } from '@/lib/types';

interface Props { catId: CategoryId; dark?: boolean; }

export default function CategoryChip({ catId, dark }: Props) {
  const cat = CATEGORIES[catId];
  if (!cat) return null;
  const Icon = getCategoryIcon(catId);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 5,
      background: `${cat.color}18`,
      color: cat.color,
      fontSize: 11, fontWeight: 600,
    }}>
      <Icon size={11} stroke="currentColor"/>
      {cat.label}
    </span>
  );
}

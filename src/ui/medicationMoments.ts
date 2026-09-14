import {
  BedDouble,
  Coffee,
  Cookie,
  Moon,
  Sun,
  Utensils,
} from 'lucide-react'
import type { ComponentType } from 'react'
import type { MealMoment } from '../domain/patient'

export const momentInfo: Record<
  MealMoment,
  { label: string; icon: ComponentType<{ size?: number }>; color: string }
> = {
  jejum: { label: 'Ao acordar / jejum', icon: Sun, color: 'yellow' },
  cafe: { label: 'Café da manhã', icon: Coffee, color: 'orange' },
  almoco: { label: 'Almoço', icon: Utensils, color: 'green' },
  lanche: { label: 'Lanche', icon: Cookie, color: 'blue' },
  jantar: { label: 'Jantar', icon: Moon, color: 'purple' },
  deitar: { label: 'Antes de dormir', icon: BedDouble, color: 'navy' },
}

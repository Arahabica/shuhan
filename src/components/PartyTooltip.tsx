import { useSortable } from '@dnd-kit/sortable'
import type { CSSProperties } from 'react'
import type { Party } from '../data/parties'

interface PartyTooltipProps {
  party: Party
  top: number
}

export const PartyTooltip = ({ party, top }: PartyTooltipProps) => {
  const { attributes, listeners, setNodeRef } = useSortable({
    id: party.id,
  })

  const style: CSSProperties = {
    top: `${top}px`,
    backgroundColor: party.color,
  }

  return (
    <div
      ref={setNodeRef}
      className="chart__tooltip"
      style={style}
      {...attributes}
      {...listeners}
    >
      <span className="tooltip__name">{party.shortName}</span>
      <span className="tooltip__seats">{party.seats}</span>
    </div>
  )
}

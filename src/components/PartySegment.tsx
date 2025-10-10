import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { CSSProperties } from 'react'
import type { Party } from '../data/parties'

interface PartySegmentProps {
  party: Party
  height: number
  isCompact: boolean
}

export const PartySegment = ({ party, height, isCompact }: PartySegmentProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: party.id,
  })

  const style: CSSProperties = {
    height: `${height}px`,
    minHeight: `${height}px`,
    maxHeight: `${height}px`,
    backgroundColor: party.color,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      className={`chart__segment${isCompact ? ' chart__segment--compact' : ''}`}
      data-party-id={party.id}
      style={style}
      {...attributes}
      {...listeners}
    >
      {isCompact ? (
        <span className="sr-only">
          {party.name} {party.seats} 議席
        </span>
      ) : (
        <>
          <span className="segment__name">{party.shortName}</span>
          <span className="segment__seats">{party.seats}</span>
        </>
      )}
    </div>
  )
}

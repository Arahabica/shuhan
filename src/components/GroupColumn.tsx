import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { CSSProperties } from 'react'
import type { Party, GroupId } from '../data/parties'
import { PartySegment } from './PartySegment'

interface SegmentLayout {
  party: Party
  height: number
  isCompact: boolean
  centerFromTop: number
  tooltipTop?: number
  connectorOffset?: number
}

interface GroupColumnProps {
  groupId: GroupId
  groupName: string
  totalSeats: number
  parties: Party[]
  segments: SegmentLayout[]
  stackHeight: number
  tooltipHeight: number
}

export const GroupColumn = ({
  groupId,
  groupName,
  totalSeats,
  parties,
  segments,
  stackHeight,
  tooltipHeight,
}: GroupColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: groupId,
  })

  return (
    <article className="chart__column">
      <header className="chart__columnHeader">
        <h2 className="chart__columnTitle">{groupName}</h2>
        <span className="chart__columnSeats">{totalSeats} 議席</span>
      </header>

      <div className="chart__stackRow" style={{ height: `${stackHeight}px` }}>
        <div className="chart__stackColumn chart__stackColumn--bar" ref={setNodeRef}>
          <SortableContext items={parties.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="chart__stack">
              {segments.map((segment) => (
                <PartySegment
                  key={segment.party.id}
                  party={segment.party}
                  height={segment.height}
                  isCompact={segment.isCompact}
                />
              ))}
            </div>
          </SortableContext>
        </div>

        <div className="chart__stackColumn chart__stackColumn--tooltip" aria-hidden="true">
          <svg className="chart__connector" width="100%" height={stackHeight}>
            {segments
              .filter((segment) => segment.isCompact && segment.tooltipTop != null)
              .map((segment) => {
                const tooltipCenter = segment.tooltipTop! + tooltipHeight / 2
                return (
                  <line
                    key={`${groupId}-${segment.party.id}-connector`}
                    x1="0"
                    y1={segment.centerFromTop}
                    x2="12"
                    y2={tooltipCenter}
                    stroke={segment.party.color}
                    strokeWidth="1.5"
                    strokeOpacity="0.6"
                  />
                )
              })}
          </svg>

          <div className="chart__tooltipRail">
            {segments
              .filter((segment) => segment.isCompact && segment.tooltipTop != null)
              .map((segment) => (
                <div
                  className="chart__tooltip"
                  key={`${groupId}-${segment.party.id}-tooltip`}
                  style={{
                    top: `${segment.tooltipTop}px`,
                    backgroundColor: segment.party.color,
                  } as CSSProperties}
                >
                  <span className="tooltip__name">{segment.party.shortName}</span>
                  <span className="tooltip__seats">{segment.party.seats}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </article>
  )
}

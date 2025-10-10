import { Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { Party, GroupId, PartyId } from '../data/parties'
import { PartySegment } from './PartySegment'
import { PartyTooltip } from './PartyTooltip'

const SEAT_TO_PIXEL = 1.4

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
  activeParty: Party | null
  overPartyId: string | null
  className?: string
  style?: React.CSSProperties
  onTransitionEnd?: () => void
}

export const GroupColumn = ({
  groupId,
  groupName,
  totalSeats,
  parties,
  segments,
  stackHeight,
  tooltipHeight,
  activeParty,
  overPartyId,
  className,
  style,
  onTransitionEnd,
}: GroupColumnProps) => {
  const { setNodeRef } = useDroppable({
    id: groupId,
  })

  // Determine if we should show a placeholder
  const showPlaceholder = activeParty && overPartyId
  const isOverThisGroup = overPartyId === groupId
  const overPartyInThisGroup = segments.find((s) => s.party.id === overPartyId)

  return (
    <article className={className || 'chart__column'} style={style} onTransitionEnd={onTransitionEnd}>
      <header className="chart__columnHeader">
        <h2 className="chart__columnTitle">{groupName}</h2>
        <span className="chart__columnSeats">{totalSeats} 議席</span>
      </header>

      <div className="chart__stackRow" style={{ height: `${stackHeight}px` }}>
        <div className="chart__stackColumn chart__stackColumn--bar" ref={setNodeRef}>
          <SortableContext items={parties.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="chart__stack">
              {/* Show placeholder at the top if hovering over empty group area */}
              {showPlaceholder && isOverThisGroup && !overPartyInThisGroup && (
                <div
                  className="chart__segment chart__segment--placeholder"
                  style={{
                    height: `${activeParty.seats * SEAT_TO_PIXEL}px`,
                    backgroundColor: activeParty.color,
                    opacity: 0.3,
                    pointerEvents: 'none',
                  }}
                >
                  <span className="segment__name">{activeParty.shortName}</span>
                  <span className="segment__seats">{activeParty.seats}</span>
                </div>
              )}
              {segments.map((segment, index) => (
                <Fragment key={segment.party.id}>
                  {/* Show placeholder before the hovered segment */}
                  {showPlaceholder &&
                    overPartyId === segment.party.id &&
                    activeParty.id !== segment.party.id && (
                      <div
                        className="chart__segment chart__segment--placeholder"
                        style={{
                          height: `${activeParty.seats * SEAT_TO_PIXEL}px`,
                          backgroundColor: activeParty.color,
                          opacity: 0.3,
                          pointerEvents: 'none',
                        }}
                      >
                        <span className="segment__name">{activeParty.shortName}</span>
                        <span className="segment__seats">{activeParty.seats}</span>
                      </div>
                    )}
                  <PartySegment
                    party={segment.party}
                    height={segment.height}
                    isCompact={segment.isCompact}
                  />
                </Fragment>
              ))}
            </div>
          </SortableContext>
        </div>

        <div className="chart__stackColumn chart__stackColumn--tooltip">
          <svg className="chart__connector" width="100%" height={stackHeight} aria-hidden="true">
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
                <PartyTooltip
                  key={`${groupId}-${segment.party.id}-tooltip`}
                  party={segment.party}
                  top={segment.tooltipTop!}
                />
              ))}
          </div>
        </div>
      </div>
    </article>
  )
}

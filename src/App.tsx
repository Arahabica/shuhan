import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Modifier,
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  chamberTotal,
  majorityThreshold,
  parties,
  type Group,
  type Party,
  type PartyId,
} from './data/parties'
import { useChartStore } from './store/useChartStore'
import { GroupColumn } from './components/GroupColumn'

interface GroupWithParties extends Group {
  parties: Party[]
  totalSeats: number
}

interface SegmentLayout {
  party: Party
  height: number
  isCompact: boolean
  centerFromTop: number
  tooltipTop?: number
  connectorOffset?: number
}

const SEAT_TO_PIXEL = 1.4
const TOOLTIP_HEIGHT = 20
const TOOLTIP_SPACING = 4

const App = () => {
  const { groups: storeGroups, movePartyToGroup, reorderPartiesInGroup, swapRulingAndOpposition } = useChartStore()
  const [activeId, setActiveId] = useState<PartyId | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [isDraggingFromTooltip, setIsDraggingFromTooltip] = useState<boolean>(false)
  const [swapState, setSwapState] = useState<'idle' | 'animating' | 'swapped'>('idle')
  const transitionCountRef = useRef(0)
  const dataSwappedRef = useRef(false)

  // Modifier to offset drag overlay above finger/cursor for compact parties
  const offsetAboveModifier: Modifier = useMemo(
    () =>
      ({ transform }) => {
        return {
          x: isDraggingFromTooltip ? transform.x : transform.x - 75,
          y: transform.y - 60,
          scaleX: 1,
          scaleY: 1,
        }
      },
    [isDraggingFromTooltip],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
  )

  const groups = useMemo<GroupWithParties[]>(() => {
    const partyMap = new Map(parties.map((party) => [party.id, party] as const))

    return storeGroups.map((group) => {
      const groupedParties = group.partyIds
        .map((partyId) => partyMap.get(partyId))
        .filter((party): party is Party => Boolean(party))

      const totalSeats = groupedParties.reduce((sum, party) => sum + party.seats, 0)

      return {
        ...group,
        parties: groupedParties,
        totalSeats,
      }
    })
  }, [storeGroups])

  const maxGroupSeats = Math.max(...groups.map((g) => g.totalSeats))
  const minHeight = chamberTotal * SEAT_TO_PIXEL * 0.62
  const stackHeight = Math.max(maxGroupSeats * SEAT_TO_PIXEL, minHeight)

  const groupsWithLayout = groups.map((group) => {
    const segments: SegmentLayout[] = group.parties.map((party) => ({
      party,
      height: party.seats * SEAT_TO_PIXEL,
      isCompact: party.seats <= 20,
      centerFromTop: 0,
    }))

    let offsetFromBottom = 0
    for (let index = segments.length - 1; index >= 0; index -= 1) {
      const segment = segments[index]
      const centerFromBottom = offsetFromBottom + segment.height / 2
      segment.centerFromTop = stackHeight - centerFromBottom
      offsetFromBottom += segment.height
    }

    const compactSegments = segments
      .filter((segment) => segment.isCompact)
      .sort((a, b) => a.centerFromTop - b.centerFromTop)

    if (compactSegments.length > 0) {
      const placements = compactSegments.map((segment) => ({
        segment,
        idealTop: Math.min(
          Math.max(segment.centerFromTop - TOOLTIP_HEIGHT / 2, 0),
          stackHeight - TOOLTIP_HEIGHT,
        ),
        top: 0,
      }))

      placements.sort((a, b) => a.idealTop - b.idealTop)

      let previousBottom = -TOOLTIP_SPACING
      for (const placement of placements) {
        const minTop = previousBottom + TOOLTIP_SPACING
        placement.top = Math.max(placement.idealTop, minTop)
        previousBottom = placement.top + TOOLTIP_HEIGHT
      }

      let bottomOverflow = previousBottom - stackHeight
      if (bottomOverflow > 0) {
        for (const placement of placements) {
          placement.top -= bottomOverflow
        }

        let minTop = Math.min(...placements.map((placement) => placement.top))
        if (minTop < 0) {
          const shift = -minTop
          for (const placement of placements) {
            placement.top += shift
          }
        }

        previousBottom = -TOOLTIP_SPACING
        for (const placement of placements) {
          const minTop = previousBottom + TOOLTIP_SPACING
          placement.top = Math.max(placement.top, minTop)
          previousBottom = placement.top + TOOLTIP_HEIGHT
        }
      }

      for (const placement of placements) {
        const { segment, top } = placement
        const clampedTop = Math.min(Math.max(top, 0), stackHeight - TOOLTIP_HEIGHT)
        segment.tooltipTop = clampedTop
        segment.connectorOffset = segment.centerFromTop - (clampedTop + TOOLTIP_HEIGHT / 2)
      }
    }

    return {
      ...group,
      segments,
    }
  })

  const rulingSeats = groups.find((group) => group.id === 'ruling')?.totalSeats ?? 0
  const oppositionSeats = groups.find((group) => group.id === 'opposition')?.totalSeats ?? 0

  // 与党と野党の議席数を監視し、逆転したらアニメーションをトリガー
  useEffect(() => {
    if (swapState === 'idle' && oppositionSeats > rulingSeats) {
      setSwapState('animating')
      transitionCountRef.current = 0
      dataSwappedRef.current = false
    }
  }, [rulingSeats, oppositionSeats, swapState])

  // アニメーション完了時のハンドラー
  const handleTransitionEnd = () => {
    transitionCountRef.current += 1
    // 与党と野党の両方のアニメーションが完了したら、データを入れ替える
    if (transitionCountRef.current >= 2) {
      // アニメーション終了時点で transform を固定（transition は無効化）
      setSwapState('swapped')
      transitionCountRef.current = 0
      // transition無効のままデータを入れ替え
      requestAnimationFrame(() => {
        dataSwappedRef.current = true
        swapRulingAndOpposition()
        // 次のフレームでidleに戻す
        requestAnimationFrame(() => {
          setSwapState('idle')
        })
      })
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as PartyId)

    // ドラッグ開始時の要素を確認して、ツールチップかバーかを判定
    const target = event.activatorEvent?.target as HTMLElement
    let element: HTMLElement | null = target
    let isFromTooltip = false

    // 親要素を最大5階層まで遡ってクラス名を確認
    for (let i = 0; i < 5 && element; i++) {
      if (element.classList?.contains('chart__tooltip')) {
        isFromTooltip = true
        break
      }
      if (element.classList?.contains('chart__segment')) {
        isFromTooltip = false
        break
      }
      element = element.parentElement
    }

    setIsDraggingFromTooltip(isFromTooltip)
  }

  const handleDragOver = (event: DragOverEvent) => {
    setOverId(event.over?.id?.toString() ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverId(null)

    if (!over || active.id === over.id) return

    const activeId = active.id as PartyId
    const activeGroup = storeGroups.find((g) => g.partyIds.includes(activeId))
    if (!activeGroup) return

    // Check if over.id is a group ID
    const overAsGroup = storeGroups.find((g) => g.id === over.id)
    if (overAsGroup) {
      if (activeGroup.id === overAsGroup.id) {
        // Same group - move to top
        const oldIndex = activeGroup.partyIds.indexOf(activeId)
        const newPartyIds = [...activeGroup.partyIds]
        newPartyIds.splice(oldIndex, 1)
        newPartyIds.unshift(activeId)
        reorderPartiesInGroup(activeGroup.id, newPartyIds)
      } else {
        // Different group - move to the beginning (top)
        movePartyToGroup(activeId, activeGroup.id, overAsGroup.id, 0)
      }
      return
    }

    // over.id is a party ID
    const overId = over.id as PartyId
    const overGroup = storeGroups.find((g) => g.partyIds.includes(overId))
    if (!overGroup) return

    if (activeGroup.id === overGroup.id) {
      // Reorder within the same group
      const oldIndex = activeGroup.partyIds.indexOf(activeId)
      const newIndex = activeGroup.partyIds.indexOf(overId)
      const newPartyIds = arrayMove(activeGroup.partyIds, oldIndex, newIndex)
      reorderPartiesInGroup(activeGroup.id, newPartyIds)
    } else {
      // Move to a different group
      const overIndex = overGroup.partyIds.indexOf(overId)
      movePartyToGroup(activeId, activeGroup.id, overGroup.id, overIndex)
    }
  }

  const activeParty = activeId ? parties.find((p) => p.id === activeId) ?? null : null

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="app">
        <div className="app__shell">
          <header className="app__header">
            <div className="header__titles">
              <h1 className="header__headline">首班指名シミュレータ</h1>
            </div>
          </header>

          <main className="app__main">
            <section className="chart" aria-label="政党グループ別議席構成">
              {groupsWithLayout.map((group) => {
                let transform = ''
                let className = 'chart__column'
                let onTransitionEnd: (() => void) | undefined

                // データ入れ替え前のみtransformを適用
                if ((swapState === 'animating' || swapState === 'swapped') && !dataSwappedRef.current) {
                  if (group.id === 'ruling') {
                    transform = 'translateX(calc(100% + var(--column-gap)))'
                    if (swapState === 'animating') {
                      onTransitionEnd = handleTransitionEnd
                    }
                  } else if (group.id === 'opposition') {
                    transform = 'translateX(calc(-100% - var(--column-gap)))'
                    if (swapState === 'animating') {
                      onTransitionEnd = handleTransitionEnd
                    }
                  }
                }

                // swapped 状態では transition を無効化
                if (swapState === 'swapped') {
                  className = 'chart__column chart__column--no-transition'
                }

                return (
                  <GroupColumn
                    key={group.id}
                    groupId={group.id}
                    groupName={group.name}
                    totalSeats={group.totalSeats}
                    parties={group.parties}
                    segments={group.segments}
                    stackHeight={stackHeight}
                    tooltipHeight={TOOLTIP_HEIGHT}
                    activeParty={activeParty}
                    overPartyId={overId}
                    className={className}
                    style={{ transform }}
                    onTransitionEnd={onTransitionEnd}
                  />
                )
              })}
            </section>
          </main>
      </div>
    </div>

    <DragOverlay modifiers={activeParty && activeParty.seats <= 20 ? [offsetAboveModifier] : []}>
      {activeParty ? (
        <div
          className="chart__segment"
          style={{
            width: '60px',
            height: activeParty.seats <= 20 ? '30px' : `${activeParty.seats * SEAT_TO_PIXEL}px`,
            backgroundColor: activeParty.color,
            opacity: 0.9,
          }}
        >
          <span className="segment__name">{activeParty.shortName}</span>
          <span className="segment__seats">{activeParty.seats}</span>
        </div>
      ) : null}
    </DragOverlay>
  </DndContext>
  )
}

export default App

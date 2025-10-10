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
import { CouncillorChart } from './components/CouncillorChart'

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

// クエリパラメータをパースしてGroup配列に変換
const parseQueryParam = (queryString: string): Group[] | null => {
  try {
    const parts = queryString.split(':')
    if (parts.length !== 3) return null

    const rulingIds = parts[0] ? parts[0].split(',').reverse() : []
    const oppositionIds = parts[1] ? parts[1].split(',').reverse() : []
    const othersIds = parts[2] ? parts[2].split(',').reverse() : []

    return [
      { id: 'ruling', name: '与党', partyIds: rulingIds as PartyId[] },
      { id: 'opposition', name: '野党', partyIds: oppositionIds as PartyId[] },
      { id: 'others', name: 'その他', partyIds: othersIds as PartyId[] },
    ]
  } catch {
    return null
  }
}

// Group配列をクエリパラメータに変換
const groupsToQueryParam = (groups: Group[]): string => {
  const ruling = groups.find((g) => g.id === 'ruling')
  const opposition = groups.find((g) => g.id === 'opposition')
  const others = groups.find((g) => g.id === 'others')

  const rulingStr = ruling ? [...ruling.partyIds].reverse().join(',') : ''
  const oppositionStr = opposition ? [...opposition.partyIds].reverse().join(',') : ''
  const othersStr = others ? [...others.partyIds].reverse().join(',') : ''

  return `${rulingStr}:${oppositionStr}:${othersStr}`
}

const App = () => {
  const { groups: storeGroups, movePartyToGroup, reorderPartiesInGroup, swapRulingAndOpposition, setGroups } = useChartStore()
  const [activeId, setActiveId] = useState<PartyId | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [isDraggingFromTooltip, setIsDraggingFromTooltip] = useState<boolean>(false)
  const [swapState, setSwapState] = useState<'idle' | 'animating' | 'swapped'>('idle')
  const transitionCountRef = useRef(0)
  const dataSwappedRef = useRef(false)
  const isInitialLoadRef = useRef(true)
  const hasUserInteractedRef = useRef(false)

  // 初期ロード時にクエリパラメータから復元
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const partiesParam = params.get('parties')

    if (partiesParam) {
      const parsedGroups = parseQueryParam(partiesParam)
      if (parsedGroups) {
        setGroups(parsedGroups)
      }
    }

    isInitialLoadRef.current = false
  }, [setGroups])

  // groups変更時にURLを更新（ユーザーが操作した後のみ）
  useEffect(() => {
    if (isInitialLoadRef.current) return
    if (!hasUserInteractedRef.current) return

    const queryParam = groupsToQueryParam(storeGroups)
    const newUrl = `${window.location.pathname}?parties=${queryParam}`
    window.history.pushState({}, '', newUrl)
  }, [storeGroups])

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

  // 過半数ラインの位置を計算（下からの距離）
  const majorityLinePosition = majorityThreshold * SEAT_TO_PIXEL

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

  // 政権名を生成
  const rulingGroup = groups.find((group) => group.id === 'ruling')
  const administrationName = useMemo(() => {
    if (!rulingGroup || rulingGroup.parties.length === 0) return ''

    if (rulingGroup.parties.length === 1) {
      return `${rulingGroup.parties[0].shortName}単独政権`
    }

    const initials = rulingGroup.parties
      .slice()
      .reverse()
      .map((party) => party.shortName.charAt(0))
      .join('')
    return `${initials}政権`
  }, [rulingGroup])

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
      hasUserInteractedRef.current = true
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

    hasUserInteractedRef.current = true
  }

  const activeParty = activeId ? parties.find((p) => p.id === activeId) ?? null : null

  // Xでシェアするリンクを生成
  const shareToX = () => {
    const text = `首班指名シミュレーターの結果、${administrationName}が誕生しそうです。\n\n${window.location.href}`
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div className="app">
        <div className="app__shell">
          <header className="app__header">
            <div className="header__titles">
              <h1 className="header__headline">首班指名シミュレーター</h1>
              {administrationName && <p className="header__administration">{administrationName}</p>}
            </div>
          </header>

          <main className="app__main">
            <section className="chart" aria-label="政党グループ別議席構成" style={{ position: 'relative' }}>
              <div className="majority-line" style={{ bottom: `${majorityLinePosition}px` }}>
                <span className="majority-line__label">過半数 ({majorityThreshold})</span>
              </div>
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

            <div className="share-section">
              <button className="share-button" onClick={shareToX} type="button">
                <svg className="share-button__icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                結果をシェア
              </button>
            </div>

            <CouncillorChart />
          </main>

          <footer className="app__footer">
            <p className="footer__credit">
              開発者: <a href="https://x.com/Arahabica1" target="_blank" rel="noopener noreferrer" className="footer__link">@Arahabica1</a>
            </p>
          </footer>
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

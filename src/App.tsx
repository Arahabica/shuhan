import { useMemo, type CSSProperties } from 'react'
import {
  chamberTotal,
  initialGroups,
  majorityThreshold,
  parties,
  type Group,
  type Party,
} from './data/parties'

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

const App = (): JSX.Element => {
  const groups = useMemo<GroupWithParties[]>(() => {
    const partyMap = new Map(parties.map((party) => [party.id, party] as const))

    return initialGroups.map((group) => {
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
  }, [])

  const stackHeight = chamberTotal * SEAT_TO_PIXEL * 0.6

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
  const seatsToMajority = Math.max(majorityThreshold - rulingSeats, 0)

  return (
    <div className="app">
      <div className="app__shell">
        <header className="app__header">
          <div className="header__titles">
            <p className="header__label">衆議院議席シミュレーター</p>
            <h1 className="header__headline">過半数ラインまでの距離</h1>
          </div>
          <div className="header__summary" role="status" aria-live="polite">
            <div>
              <span className="summary__label">与党合計</span>
              <span className="summary__value">{rulingSeats} 議席</span>
            </div>
            <div>
              <span className="summary__label">過半数まで</span>
              <span className="summary__value">{seatsToMajority} 議席</span>
            </div>
          </div>
        </header>

        <main className="app__main">
          <section className="chart" aria-label="政党グループ別議席構成">
            {groupsWithLayout.map((group) => (
              <article className="chart__column" key={group.id}>
                <header className="chart__columnHeader">
                  <h2 className="chart__columnTitle">{group.name}</h2>
                  <span className="chart__columnSeats">{group.totalSeats} 議席</span>
                </header>

                <div
                  className="chart__stackRow"
                  style={{ height: `${stackHeight}px` }}
                >
                  <div className="chart__stackColumn chart__stackColumn--bar">
                    <div className="chart__stack">
                      {group.segments.map((segment) => (
                        <div
                          className={`chart__segment${segment.isCompact ? ' chart__segment--compact' : ''}`}
                          key={segment.party.id}
                          data-party-id={segment.party.id}
                          style={{
                            height: `${segment.height}px`,
                            backgroundColor: segment.party.color,
                          }}
                        >
                          {segment.isCompact ? (
                            <span className="sr-only">
                              {segment.party.name} {segment.party.seats} 議席
                            </span>
                          ) : (
                            <>
                              <span className="segment__name">{segment.party.shortName}</span>
                              <span className="segment__seats">{segment.party.seats}</span>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    className="chart__stackColumn chart__stackColumn--tooltip"
                    aria-hidden="true"
                  >
                    <svg
                      className="chart__connector"
                      width="100%"
                      height={stackHeight}
                    >
                      {group.segments
                        .filter(
                          (segment) => segment.isCompact && segment.tooltipTop != null,
                        )
                        .map((segment) => {
                          const tooltipCenter = segment.tooltipTop! + TOOLTIP_HEIGHT / 2
                          return (
                            <line
                              key={`${group.id}-${segment.party.id}-connector`}
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
                      {group.segments
                        .filter(
                          (segment) => segment.isCompact && segment.tooltipTop != null,
                        )
                        .map((segment) => (
                          <div
                            className="chart__tooltip"
                            key={`${group.id}-${segment.party.id}-tooltip`}
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
            ))}
          </section>
        </main>

        <footer className="app__footer">
          <p className="footer__note">
            現在は表示比率のサンプルです。次のステップでドラッグ&ドロップと詳細機能を加えます。
          </p>
          <p className="footer__meta">議席総数 {chamberTotal} ／ 過半数 {majorityThreshold}</p>
        </footer>
      </div>
    </div>
  )
}

export default App

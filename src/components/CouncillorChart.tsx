import { useMemo } from 'react'
import { councillorParties, councillorInitialGroups, councillorsMajority, councillorsTotal, type Party } from '../data/parties'
import { useChartStore } from '../store/useChartStore'

export const CouncillorChart = () => {
  const { groups: storeGroups } = useChartStore()

  // 参議院用のグループを生成（衆議院のstoreGroupsから計算）
  const councillorGroups = useMemo(() => {
    const partyMap = new Map(councillorParties.map((party) => [party.id, party] as const))

    return storeGroups.map((group) => {
      const groupedParties = group.partyIds
        .map((partyId) => partyMap.get(partyId))
        .filter((party): party is Party => Boolean(party))

      const totalSeats = groupedParties.reduce((sum, party) => sum + party.seats, 0)

      return {
        id: group.id,
        name: group.name,
        parties: groupedParties,
        totalSeats,
      }
    })
  }, [storeGroups])

  const rulingGroup = councillorGroups.find((g) => g.id === 'ruling')
  const oppositionGroup = councillorGroups.find((g) => g.id === 'opposition')

  if (!rulingGroup || !oppositionGroup) return null

  // 過半数ラインの位置（左からのパーセント）
  const majorityLinePosition = (councillorsMajority / councillorsTotal) * 100

  return (
    <div className="councillor-chart">
      <h3 className="councillor-chart__title">参議院</h3>

      <div className="councillor-chart__content">
        <div className="councillor-chart__row">
          <div className="councillor-chart__label">与党</div>
          <div className="councillor-chart__bar-wrapper">
            <div className="councillor-chart__bar">
              {rulingGroup.parties.map((party) => (
                <div
                  key={party.id}
                  className="councillor-chart__segment"
                  style={{
                    width: `${(party.seats / councillorsTotal) * 100}%`,
                    backgroundColor: party.color,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="councillor-chart__total">{rulingGroup.totalSeats}</div>
        </div>

        <div className="councillor-chart__row">
          <div className="councillor-chart__label">野党</div>
          <div className="councillor-chart__bar-wrapper">
            <div className="councillor-chart__bar">
              {oppositionGroup.parties.map((party) => (
                <div
                  key={party.id}
                  className="councillor-chart__segment"
                  style={{
                    width: `${(party.seats / councillorsTotal) * 100}%`,
                    backgroundColor: party.color,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="councillor-chart__total">{oppositionGroup.totalSeats}</div>
        </div>

        <div className="councillor-chart__majority-line" style={{ left: `calc(48px + (100% - 86px) * ${majorityLinePosition / 100})` }} />
      </div>
    </div>
  )
}

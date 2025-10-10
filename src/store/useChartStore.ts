import { create } from 'zustand'
import { initialGroups, type Group, type GroupId, type PartyId } from '../data/parties'

interface ChartState {
  groups: Group[]
  movePartyToGroup: (partyId: PartyId, fromGroupId: GroupId, toGroupId: GroupId, index?: number) => void
  reorderPartiesInGroup: (groupId: GroupId, partyIds: PartyId[]) => void
}

export const useChartStore = create<ChartState>((set) => ({
  groups: initialGroups,

  movePartyToGroup: (partyId, fromGroupId, toGroupId, index) =>
    set((state) => {
      const newGroups = state.groups.map((group) => ({ ...group, partyIds: [...group.partyIds] }))

      const fromGroup = newGroups.find((g) => g.id === fromGroupId)
      const toGroup = newGroups.find((g) => g.id === toGroupId)

      if (!fromGroup || !toGroup) return state

      // Remove party from source group
      const partyIndex = fromGroup.partyIds.indexOf(partyId)
      if (partyIndex === -1) return state
      fromGroup.partyIds.splice(partyIndex, 1)

      // Add party to target group
      if (index !== undefined) {
        toGroup.partyIds.splice(index, 0, partyId)
      } else {
        toGroup.partyIds.push(partyId)
      }

      return { groups: newGroups }
    }),

  reorderPartiesInGroup: (groupId, partyIds) =>
    set((state) => {
      const newGroups = state.groups.map((group) => {
        if (group.id === groupId) {
          return { ...group, partyIds }
        }
        return group
      })
      return { groups: newGroups }
    }),
}))

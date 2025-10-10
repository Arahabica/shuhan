// Data source: NHK 2024年10月27日衆議院総選挙結果 (確認日: 2025-10-10)
export const chamberTotal = 465 as const
export const majorityThreshold = 233 as const

export type PartyId =
  | 'ldp'
  | 'komeito'
  | 'cdp'
  | 'ishin'
  | 'dpp'
  | 'reiwa'
  | 'jcp'
  | 'sdp'
  | 'sanseito'
  | 'japan-conservative'
  | 'independent'

export type GroupId = 'ruling' | 'opposition' | 'others'

export interface Party {
  id: PartyId
  name: string
  shortName: string
  seats: number
  color: string
}

export interface Group {
  id: GroupId
  name: string
  partyIds: PartyId[]
}

export const parties = [
  {
    id: 'ldp',
    name: '自由民主党',
    shortName: '自民',
    seats: 191,
    color: '#E60026',
  },
  {
    id: 'komeito',
    name: '公明党',
    shortName: '公明',
    seats: 24,
    color: '#F8B500',
  },
  {
    id: 'cdp',
    name: '立憲民主党',
    shortName: '立民',
    seats: 148,
    color: '#004098',
  },
  {
    id: 'ishin',
    name: '日本維新の会',
    shortName: '維新',
    seats: 38,
    color: '#6DB33F',
  },
  {
    id: 'dpp',
    name: '国民民主党',
    shortName: '国民',
    seats: 28,
    color: '#00418B',
  },
  {
    id: 'reiwa',
    name: 'れいわ新選組',
    shortName: 'れいわ',
    seats: 9,
    color: '#FF0080',
  },
  {
    id: 'jcp',
    name: '日本共産党',
    shortName: '共産',
    seats: 8,
    color: '#E60012',
  },
  {
    id: 'sdp',
    name: '社会民主党',
    shortName: '社民',
    seats: 1,
    color: '#1B62B9',
  },
  {
    id: 'sanseito',
    name: '参政党',
    shortName: '参政',
    seats: 3,
    color: '#F37021',
  },
  {
    id: 'japan-conservative',
    name: '日本保守党',
    shortName: '保守',
    seats: 3,
    color: '#0F3B63',
  },
  {
    id: 'independent',
    name: '無所属',
    shortName: '無所属',
    seats: 12,
    color: '#666666',
  },
] satisfies Party[]

export const initialGroups = [
  {
    id: 'ruling',
    name: '与党',
    partyIds: ['ldp'],
  },
  {
    id: 'opposition',
    name: '野党',
    partyIds: ['cdp', 'jcp', 'sdp'],
  },
  {
    id: 'others',
    name: 'その他',
    partyIds: ['komeito', 'ishin', 'dpp', 'reiwa', 'sanseito', 'japan-conservative', 'independent'],
  },
] satisfies Group[]

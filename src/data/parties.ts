// Data source: 衆議院会派別所属議員数 (確認日: 2025-10-11)
export const chamberTotal = 465 as const
export const majorityThreshold = 233 as const

// 参議院
export const councillorsTotal = 248 as const
export const councillorsMajority = 125 as const

export type PartyId =
  | 'ldp'
  | 'kome'
  | 'cdp'
  | 'ishi'
  | 'dpp'
  | 'rei'
  | 'jcp'
  | 'sdp'
  | 'san'
  | 'hoshu'
  | 'yuu'
  | 'gen'
  | 'mu'
  | 'okinawa'

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
    seats: 196,
    color: '#E60026',
  },
  {
    id: 'kome',
    name: '公明党',
    shortName: '公明',
    seats: 24,
    color: '#F8B500',
  },
  {
    id: 'cdp',
    name: '立憲民主党',
    shortName: '立民',
    seats: 147,
    color: '#004098',
  },
  {
    id: 'ishi',
    name: '日本維新の会',
    shortName: '維新',
    seats: 35,
    color: '#6DB33F',
  },
  {
    id: 'dpp',
    name: '国民民主党',
    shortName: '国民',
    seats: 27,
    color: '#00418B',
  },
  {
    id: 'rei',
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
    id: 'san',
    name: '参政党',
    shortName: '参政',
    seats: 3,
    color: '#F37021',
  },
  {
    id: 'hoshu',
    name: '日本保守党',
    shortName: '保守',
    seats: 1,
    color: '#0F3B63',
  },
  {
    id: 'yuu',
    name: '有志・改革の会',
    shortName: '有志',
    seats: 7,
    color: '#00A0E9',
  },
  {
    id: 'gen',
    name: '減税保守こども',
    shortName: '減税',
    seats: 2,
    color: '#9B7CB6',
  },
  {
    id: 'mu',
    name: '無所属',
    shortName: '無',
    seats: 5,
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
    partyIds: ['sdp', 'jcp', 'cdp'],
  },
  {
    id: 'others',
    name: 'その他',
    partyIds: ['kome', 'ishi', 'dpp', 'rei', 'san', 'hoshu', 'yuu', 'gen', 'mu'],
  },
] satisfies Group[]

// 参議院の政党データ
export const councillorParties = [
  {
    id: 'ldp',
    name: '自由民主党',
    shortName: '自民',
    seats: 100,
    color: '#E60026',
  },
  {
    id: 'cdp',
    name: '立憲民主党',
    shortName: '立民',
    seats: 41,
    color: '#004098',
  },
  {
    id: 'sdp',
    name: '社会民主党',
    shortName: '社民',
    seats: 1,
    color: '#1B62B9',
  },
  {
    id: 'dpp',
    name: '国民民主党',
    shortName: '国民',
    seats: 25,
    color: '#00418B',
  },
  {
    id: 'kome',
    name: '公明党',
    shortName: '公明',
    seats: 21,
    color: '#F8B500',
  },
  {
    id: 'ishi',
    name: '日本維新の会',
    shortName: '維新',
    seats: 19,
    color: '#6DB33F',
  },
  {
    id: 'san',
    name: '参政党',
    shortName: '参政',
    seats: 15,
    color: '#F37021',
  },
  {
    id: 'jcp',
    name: '日本共産党',
    shortName: '共産',
    seats: 7,
    color: '#E60012',
  },
  {
    id: 'rei',
    name: 'れいわ新選組',
    shortName: 'れいわ',
    seats: 6,
    color: '#FF0080',
  },
  {
    id: 'hoshu',
    name: '日本保守党',
    shortName: '保守',
    seats: 2,
    color: '#0F3B63',
  },
  {
    id: 'okinawa',
    name: '沖縄の風',
    shortName: '沖縄',
    seats: 2,
    color: '#2ecc71',
  },
  {
    id: 'mu',
    name: '各派に属しない議員',
    shortName: '無',
    seats: 9,
    color: '#666666',
  },
] satisfies Party[]

export const councillorInitialGroups = [
  {
    id: 'ruling',
    name: '与党',
    partyIds: ['ldp'],
  },
  {
    id: 'opposition',
    name: '野党',
    partyIds: ['sdp', 'jcp', 'cdp'],
  },
  {
    id: 'others',
    name: 'その他',
    partyIds: ['kome', 'ishi', 'dpp', 'rei', 'san', 'hoshu', 'okinawa', 'mu'],
  },
] satisfies Group[]

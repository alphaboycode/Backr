export interface Campaign {
  id: bigint;
  creator: `0x${string}`;
  title: string;
  description: string;
  goal: bigint;
  deadline: bigint;
  totalRaised: bigint;
  withdrawn: boolean;
}

export type CampaignStatus = 'Active' | 'Successful' | 'Failed';

export type FilterTab = 'all' | 'active' | 'successful' | 'failed' | 'mine';

export interface TxState {
  status: 'idle' | 'pending' | 'success' | 'error';
  hash?: `0x${string}`;
  message?: string;
  action?: string;
}

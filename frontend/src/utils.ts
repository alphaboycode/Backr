import { formatEther, parseEther } from 'viem';
import { Campaign, CampaignStatus } from './types';

export function shortenAddress(address?: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatBOT(amountWei: bigint, maxDecimals: number = 4): string {
  const str = formatEther(amountWei);
  const parts = str.split('.');
  if (parts.length === 1) return parts[0];
  const decimals = parts[1].slice(0, maxDecimals).replace(/0+$/, '');
  return decimals ? `${parts[0]}.${decimals}` : parts[0];
}

export function parseBOT(botAmountStr: string): bigint {
  return parseEther(botAmountStr);
}

export function getCampaignStatus(campaign: Campaign, nowSec: number): CampaignStatus {
  if (nowSec < Number(campaign.deadline)) {
    return 'Active';
  } else if (campaign.totalRaised >= campaign.goal) {
    return 'Successful';
  } else {
    return 'Failed';
  }
}

export function getTimeRemaining(deadline: bigint, nowSec: number): { ended: boolean; text: string } {
  const diff = Number(deadline) - nowSec;
  if (diff <= 0) {
    return { ended: true, text: 'Ended' };
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  if (days > 0) {
    return { ended: false, text: `${days}d ${hours}h left` };
  }
  if (hours > 0) {
    return { ended: false, text: `${hours}h ${minutes}m left` };
  }
  if (minutes > 0) {
    return { ended: false, text: `${minutes}m left` };
  }
  return { ended: false, text: '< 1m left' };
}

export function formatDate(timestampSec: bigint): string {
  return new Date(Number(timestampSec) * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

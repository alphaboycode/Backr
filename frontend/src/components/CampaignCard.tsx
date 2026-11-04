import React from 'react';
import { Campaign } from '../types';
import { formatBOT, getCampaignStatus, getTimeRemaining, shortenAddress } from '../utils';

interface Props {
  campaign: Campaign;
  nowSec: number;
  connectedAddress?: `0x${string}`;
  onSelect: (campaign: Campaign) => void;
}

export const CampaignCard: React.FC<Props> = ({
  campaign,
  nowSec,
  connectedAddress,
  onSelect,
}) => {
  const status = getCampaignStatus(campaign, nowSec);
  const timeInfo = getTimeRemaining(campaign.deadline, nowSec);

  const isCreator =
    !!connectedAddress &&
    campaign.creator.toLowerCase() === connectedAddress.toLowerCase();

  // Progress percentage
  let percent = 0;
  if (campaign.goal > 0n) {
    const raw = Number((campaign.totalRaised * 10000n) / campaign.goal) / 100;
    percent = Math.min(raw, 100);
  }
  const displayPercent =
    campaign.goal > 0n
      ? Math.round(Number((campaign.totalRaised * 100n) / campaign.goal))
      : 0;

  const statusClass = status.toLowerCase();

  return (
    <div className="campaign-card" onClick={() => onSelect(campaign)}>
      <div className="card-top">
        <span className={`status-badge ${statusClass}`}>
          {status}
        </span>
        <span className="time-left">
          {timeInfo.text}
        </span>
      </div>

      {/* Title rendered as plain text */}
      <h3 className="card-title">{campaign.title}</h3>

      {/* Description preview rendered as plain text */}
      <p className="card-desc">{campaign.description}</p>

      <div className="progress-container">
        <div className="progress-bar-bg">
          <div
            className={`progress-bar-fill ${statusClass}`}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="progress-meta">
          <div>
            <span className="progress-raised">{formatBOT(campaign.totalRaised)} BOT</span>
            <span className="progress-goal"> / {formatBOT(campaign.goal)} BOT</span>
          </div>
          <span className="progress-percent">{displayPercent}%</span>
        </div>
      </div>

      <div className="card-footer">
        <span className="creator-tag">
          by {shortenAddress(campaign.creator)}
          {isCreator && <span className="you-badge">You</span>}
        </span>
        <span style={{ color: '#60a5fa', fontWeight: 600 }}>View details →</span>
      </div>
    </div>
  );
};

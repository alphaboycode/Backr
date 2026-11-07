import React, { useState } from 'react';
import { Campaign } from '../types';
import { formatBOT, formatDate, getCampaignStatus, getTimeRemaining, shortenAddress } from '../utils';

interface Props {
  campaign: Campaign;
  nowSec: number;
  userPledge: bigint;
  connectedAddress?: `0x${string}`;
  isWrongNetwork: boolean;
  onClose: () => void;
  onPledge: (campaignId: bigint, amountBOT: string) => Promise<void>;
  onWithdraw: (campaignId: bigint) => Promise<void>;
  onRefund: (campaignId: bigint) => Promise<void>;
  isActionLoading: boolean;
}

export const CampaignDetailModal: React.FC<Props> = ({
  campaign,
  nowSec,
  userPledge,
  connectedAddress,
  isWrongNetwork,
  onClose,
  onPledge,
  onWithdraw,
  onRefund,
  isActionLoading,
}) => {
  const [pledgeAmount, setPledgeAmount] = useState('');

  const status = getCampaignStatus(campaign, nowSec);
  const timeInfo = getTimeRemaining(campaign.deadline, nowSec);

  const isCreator =
    !!connectedAddress &&
    campaign.creator.toLowerCase() === connectedAddress.toLowerCase();

  const statusClass = status.toLowerCase();

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

  const handlePledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(pledgeAmount);
    if (isNaN(num) || num <= 0 || isActionLoading) return;
    await onPledge(campaign.id, pledgeAmount);
    setPledgeAmount('');
  };

  const pledgeNum = parseFloat(pledgeAmount);
  const isPledgeValid = !isNaN(pledgeNum) && pledgeNum > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} title="Close">
          ✕
        </button>

        <div className="detail-header">
          <div className="detail-top-meta">
            <span className={`status-badge ${statusClass}`}>{status}</span>
            <span className="time-left">{timeInfo.text}</span>
          </div>

          {/* Title rendered as plain text */}
          <h2 className="detail-title">{campaign.title}</h2>

          <div className="detail-creator-row">
            <span>Created by:</span>
            <a
              href={`https://scan.botchain.ai/address/${campaign.creator}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontWeight: 600 }}
            >
              {shortenAddress(campaign.creator)}
            </a>
            {isCreator && <span className="you-badge">You</span>}
          </div>
        </div>

        {/* Full description rendered as plain text */}
        <div className="detail-desc-box">
          {campaign.description}
        </div>

        {/* Statistics Grid */}
        <div className="detail-stats-grid">
          <div className="stat-item">
            <span className="stat-label">Raised</span>
            <span className="stat-val">{formatBOT(campaign.totalRaised)} BOT</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Goal</span>
            <span className="stat-val">{formatBOT(campaign.goal)} BOT</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Progress</span>
            <span className="stat-val" style={{ color: '#60a5fa' }}>{displayPercent}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Deadline</span>
            <span className="stat-val" style={{ fontSize: '0.85rem' }}>
              {formatDate(campaign.deadline)}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Campaign ID</span>
            <span className="stat-val" style={{ fontSize: '0.85rem' }}>
              #{campaign.id.toString()}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Withdrawn</span>
            <span className="stat-val" style={{ fontSize: '0.85rem' }}>
              {campaign.withdrawn ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar-bg" style={{ height: '10px' }}>
            <div
              className={`progress-bar-fill ${statusClass}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Backer status */}
        {connectedAddress && userPledge > 0n && (
          <div className="user-pledge-callout">
            <span>You pledged: <strong>{formatBOT(userPledge)} BOT</strong></span>
            {status === 'Failed' && (
              <span style={{ fontSize: '0.8rem', color: '#fca5a5' }}>
                Eligible for full refund
              </span>
            )}
          </div>
        )}

        {/* Contextual Actions */}
        <div className="action-box">
          {status === 'Active' && (
            <div>
              <h3>Pledge to this Campaign</h3>
              {!connectedAddress ? (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  Connect your wallet to pledge BOT tokens.
                </p>
              ) : isWrongNetwork ? (
                <p style={{ color: '#fde68a', fontSize: '0.875rem' }}>
                  Please switch to BOT Mainnet to pledge.
                </p>
              ) : (
                <form onSubmit={handlePledgeSubmit}>
                  <div className="pledge-input-row">
                    <div className="pledge-input-wrapper">
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        placeholder="Amount to pledge"
                        className="pledge-input"
                        value={pledgeAmount}
                        onChange={(e) => setPledgeAmount(e.target.value)}
                        disabled={isActionLoading}
                      />
                      <span className="currency-badge">BOT</span>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!isPledgeValid || isActionLoading}
                    >
                      {isActionLoading ? (
                        <>
                          <span className="spinner" /> Pledging...
                        </>
                      ) : (
                        'Pledge BOT'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {status === 'Successful' && (
            <div>
              <h3>Campaign Successful!</h3>
              {campaign.withdrawn ? (
                <div style={{ color: '#34d399', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  ✓ All funds ({formatBOT(campaign.totalRaised)} BOT) have been withdrawn by the creator.
                </div>
              ) : isCreator ? (
                <div>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    Congratulations! The funding goal was reached. You can withdraw the full amount raised.
                  </p>
                  <button
                    className="btn btn-success"
                    onClick={() => onWithdraw(campaign.id)}
                    disabled={isActionLoading || isWrongNetwork}
                  >
                    {isActionLoading ? (
                      <>
                        <span className="spinner" /> Processing...
                      </>
                    ) : (
                      `Withdraw Funds (${formatBOT(campaign.totalRaised)} BOT)`
                    )}
                  </button>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  Goal achieved! Waiting for the creator to withdraw funds.
                </p>
              )}
            </div>
          )}

          {status === 'Failed' && (
            <div>
              <h3>Campaign Ended (Goal not met)</h3>
              {connectedAddress && userPledge > 0n ? (
                <div>
                  <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                    This campaign did not reach its goal. You can claim back your full pledge of{' '}
                    <strong>{formatBOT(userPledge)} BOT</strong>.
                  </p>
                  <button
                    className="btn btn-primary"
                    onClick={() => onRefund(campaign.id)}
                    disabled={isActionLoading || isWrongNetwork}
                  >
                    {isActionLoading ? (
                      <>
                        <span className="spinner" /> Claiming...
                      </>
                    ) : (
                      `Claim Refund (${formatBOT(userPledge)} BOT)`
                    )}
                  </button>
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  This campaign failed to reach its target goal.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

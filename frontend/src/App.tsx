import { useState, useEffect, useCallback } from 'react';
import { createWalletClient, custom } from 'viem';
import { botMainnet } from './chain';
import { BACKR_ADDRESS, BACKR_ABI, publicClient } from './contracts/config';
import { Campaign, FilterTab, TxState } from './types';
import { parseBOT, shortenAddress, getCampaignStatus } from './utils';
import { CampaignCard } from './components/CampaignCard';
import { CampaignDetailModal } from './components/CampaignDetailModal';
import { CreateCampaignForm } from './components/CreateCampaignForm';
import './App.css';

const BOT_CHAIN_ID_HEX = '0x2a5'; // 677

export function App() {
  const [account, setAccount] = useState<`0x${string}` | undefined>(undefined);
  const [chainId, setChainId] = useState<number | undefined>(undefined);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [selectedPledge, setSelectedPledge] = useState<bigint>(0n);
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [nowSec, setNowSec] = useState<number>(Math.floor(Date.now() / 1000));

  // Update live clock every second for accurate countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const isWrongNetwork = chainId !== undefined && chainId !== botMainnet.id;

  // Switch or Add BOT Mainnet
  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BOT_CHAIN_ID_HEX }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: BOT_CHAIN_ID_HEX,
                chainName: 'BOT Mainnet',
                nativeCurrency: {
                  name: 'BOT',
                  symbol: 'BOT',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc.botchain.ai'],
                blockExplorerUrls: ['https://scan.botchain.ai/'],
              },
            ],
          });
        } catch (addError) {
          console.error('Failed to add BOT Mainnet:', addError);
        }
      } else {
        console.error('Failed to switch network:', switchError);
      }
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('No Web3 wallet detected. Please install MetaMask or another injected wallet.');
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0] as `0x${string}`);
      }
      const rawChainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(parseInt(rawChainId, 16));
    } catch (err: any) {
      console.error('Wallet connection error:', err);
    }
  };

  // Disconnect wallet (UI state reset)
  const disconnectWallet = () => {
    setAccount(undefined);
  };

  // Listen for account/network changes
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        setAccount(accounts[0] as `0x${string}`);
      }
    });

    window.ethereum.request({ method: 'eth_chainId' }).then((rawChainId: string) => {
      setChainId(parseInt(rawChainId, 16));
    });

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAccount(accounts[0] as `0x${string}`);
      } else {
        setAccount(undefined);
      }
    };

    const handleChainChanged = (hexChain: string) => {
      setChainId(parseInt(hexChain, 16));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum?.removeListener('chainChanged', handleChainChanged);
    };
  }, []);

  // Fetch campaigns from contract
  const fetchCampaigns = useCallback(async () => {
    try {
      const count = await publicClient.readContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'campaignCount',
      });

      if (count === 0n) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      const list = await publicClient.readContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'getCampaigns',
        args: [0n, count],
      });

      setCampaigns([...list]);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Fetch user pledge when selected campaign changes
  const fetchUserPledge = useCallback(async (campaignId: bigint, userAddr: `0x${string}`) => {
    try {
      const pledge = await publicClient.readContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'getPledge',
        args: [campaignId, userAddr],
      });
      setSelectedPledge(pledge);
    } catch (err) {
      console.error('Failed to fetch pledge:', err);
      setSelectedPledge(0n);
    }
  }, []);

  useEffect(() => {
    if (selectedCampaign && account) {
      fetchUserPledge(selectedCampaign.id, account);
    } else {
      setSelectedPledge(0n);
    }
  }, [selectedCampaign, account, fetchUserPledge]);

  // Create Campaign
  const handleCreateCampaign = async (
    title: string,
    description: string,
    goalBOT: string,
    durationDays: number
  ) => {
    if (!account || !window.ethereum) {
      await connectWallet();
      return;
    }
    if (isWrongNetwork) {
      await switchNetwork();
      return;
    }

    try {
      setIsActionLoading(true);
      setTxState({ status: 'pending', action: 'Creating campaign...' });

      const goalWei = parseBOT(goalBOT);
      const walletClient = createWalletClient({
        chain: botMainnet,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'createCampaign',
        args: [title, description, goalWei, BigInt(durationDays)],
        account,
      });

      setTxState({
        status: 'pending',
        hash,
        action: 'Waiting for transaction confirmation...',
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setTxState({
        status: 'success',
        hash,
        message: 'Campaign created successfully!',
      });

      setIsFormOpen(false);
      await fetchCampaigns();
    } catch (err: any) {
      console.error('Error creating campaign:', err);
      setTxState({
        status: 'error',
        message: err?.shortMessage || err?.message || 'Transaction failed',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Pledge
  const handlePledge = async (campaignId: bigint, amountBOT: string) => {
    if (!account || !window.ethereum) {
      await connectWallet();
      return;
    }
    if (isWrongNetwork) {
      await switchNetwork();
      return;
    }

    try {
      setIsActionLoading(true);
      setTxState({ status: 'pending', action: 'Submitting pledge...' });

      const valueWei = parseBOT(amountBOT);
      const walletClient = createWalletClient({
        chain: botMainnet,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'pledge',
        args: [campaignId],
        value: valueWei,
        account,
      });

      setTxState({
        status: 'pending',
        hash,
        action: 'Waiting for confirmation...',
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setTxState({
        status: 'success',
        hash,
        message: `Successfully pledged ${amountBOT} BOT!`,
      });

      await fetchCampaigns();
      if (account) {
        await fetchUserPledge(campaignId, account);
      }
      // Update selected campaign in modal
      const updated = await publicClient.readContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'getCampaign',
        args: [campaignId],
      });
      setSelectedCampaign(updated);
    } catch (err: any) {
      console.error('Error pledging:', err);
      setTxState({
        status: 'error',
        message: err?.shortMessage || err?.message || 'Pledge failed',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Withdraw
  const handleWithdraw = async (campaignId: bigint) => {
    if (!account || !window.ethereum) return;
    if (isWrongNetwork) {
      await switchNetwork();
      return;
    }

    try {
      setIsActionLoading(true);
      setTxState({ status: 'pending', action: 'Withdrawing funds...' });

      const walletClient = createWalletClient({
        chain: botMainnet,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'withdraw',
        args: [campaignId],
        account,
      });

      setTxState({
        status: 'pending',
        hash,
        action: 'Waiting for confirmation...',
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setTxState({
        status: 'success',
        hash,
        message: 'Funds withdrawn to your wallet!',
      });

      await fetchCampaigns();
      const updated = await publicClient.readContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'getCampaign',
        args: [campaignId],
      });
      setSelectedCampaign(updated);
    } catch (err: any) {
      console.error('Error withdrawing:', err);
      setTxState({
        status: 'error',
        message: err?.shortMessage || err?.message || 'Withdrawal failed',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Refund
  const handleRefund = async (campaignId: bigint) => {
    if (!account || !window.ethereum) return;
    if (isWrongNetwork) {
      await switchNetwork();
      return;
    }

    try {
      setIsActionLoading(true);
      setTxState({ status: 'pending', action: 'Claiming refund...' });

      const walletClient = createWalletClient({
        chain: botMainnet,
        transport: custom(window.ethereum),
      });

      const hash = await walletClient.writeContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'refund',
        args: [campaignId],
        account,
      });

      setTxState({
        status: 'pending',
        hash,
        action: 'Waiting for confirmation...',
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setTxState({
        status: 'success',
        hash,
        message: 'Refund claimed to your wallet!',
      });

      await fetchCampaigns();
      if (account) {
        await fetchUserPledge(campaignId, account);
      }
      const updated = await publicClient.readContract({
        address: BACKR_ADDRESS,
        abi: BACKR_ABI,
        functionName: 'getCampaign',
        args: [campaignId],
      });
      setSelectedCampaign(updated);
    } catch (err: any) {
      console.error('Error claiming refund:', err);
      setTxState({
        status: 'error',
        message: err?.shortMessage || err?.message || 'Refund failed',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filter campaigns
  const filteredCampaigns = campaigns.filter((c) => {
    const status = getCampaignStatus(c, nowSec);
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return status === 'Active';
    if (activeTab === 'successful') return status === 'Successful';
    if (activeTab === 'failed') return status === 'Failed';
    if (activeTab === 'mine') {
      return account && c.creator.toLowerCase() === account.toLowerCase();
    }
    return true;
  });

  // Calculate tab counts
  const counts = {
    all: campaigns.length,
    active: campaigns.filter((c) => getCampaignStatus(c, nowSec) === 'Active').length,
    successful: campaigns.filter((c) => getCampaignStatus(c, nowSec) === 'Successful').length,
    failed: campaigns.filter((c) => getCampaignStatus(c, nowSec) === 'Failed').length,
    mine: account
      ? campaigns.filter((c) => c.creator.toLowerCase() === account.toLowerCase()).length
      : 0,
  };

  return (
    <div className="app-wrapper">
      {/* Header */}
      <header className="app-header">
        <div className="header-content">
          <div className="logo-area" onClick={() => setActiveTab('all')}>
            <img src="/backr.jpeg" alt="Backr Logo" className="logo-img" />
            <div className="logo-text">
              <h1>Backr</h1>
              <p>All-or-Nothing Crowdfunding on BOT</p>
            </div>
          </div>

          <div className="header-actions">
            {/* Network Badge */}
            <div className={`network-badge ${isWrongNetwork ? 'wrong-network' : ''}`}>
              <span className="dot" />
              <span>{isWrongNetwork ? 'Wrong Network' : 'BOT Mainnet'}</span>
            </div>

            {/* Switch network CTA if wrong network */}
            {isWrongNetwork && (
              <button className="btn btn-warning" onClick={switchNetwork}>
                Switch to BOT
              </button>
            )}

            {/* Wallet Connect / Account */}
            {!account ? (
              <button className="btn btn-primary" onClick={connectWallet}>
                Connect Wallet
              </button>
            ) : (
              <div className="wallet-pill">
                <span>{shortenAddress(account)}</span>
                <button
                  className="disconnect-btn"
                  onClick={disconnectWallet}
                  title="Disconnect"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="app-container">
        {/* Wrong network alert banner */}
        {isWrongNetwork && (
          <div className="banner banner-warning">
            <span>You are connected to an unsupported network. Please switch to BOT Mainnet (Chain ID 677).</span>
            <button className="btn btn-warning" onClick={switchNetwork}>
              Switch to BOT Mainnet
            </button>
          </div>
        )}

        {/* Transaction Status Alert */}
        {txState.status !== 'idle' && (
          <div className={`banner banner-tx ${txState.status}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {txState.status === 'pending' && <span className="spinner" />}
              {txState.status === 'success' && <span>✓</span>}
              {txState.status === 'error' && <span>⚠</span>}

              <div>
                {txState.action && <div>{txState.action}</div>}
                {txState.message && <div>{txState.message}</div>}
                {txState.hash && (
                  <div style={{ marginTop: '0.2rem' }}>
                    <a
                      href={`https://scan.botchain.ai/tx/${txState.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '0.8rem', textDecoration: 'underline' }}
                    >
                      View on BOTScan ({shortenAddress(txState.hash)}) ↗
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{ padding: '0.25rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setTxState({ status: 'idle' })}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action bar & Filters */}
        <div className="actions-bar">
          <div className="tabs-group">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All <span className="tab-count">{counts.all}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => setActiveTab('active')}
            >
              Active <span className="tab-count">{counts.active}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'successful' ? 'active' : ''}`}
              onClick={() => setActiveTab('successful')}
            >
              Successful <span className="tab-count">{counts.successful}</span>
            </button>
            <button
              className={`tab-btn ${activeTab === 'failed' ? 'active' : ''}`}
              onClick={() => setActiveTab('failed')}
            >
              Failed <span className="tab-count">{counts.failed}</span>
            </button>
            {account && (
              <button
                className={`tab-btn ${activeTab === 'mine' ? 'active' : ''}`}
                onClick={() => setActiveTab('mine')}
              >
                Mine <span className="tab-count">{counts.mine}</span>
              </button>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              if (!account) {
                connectWallet();
              } else {
                setIsFormOpen(true);
              }
            }}
          >
            + Start a Campaign
          </button>
        </div>

        {/* Create Campaign Modal / Drawer */}
        <CreateCampaignForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleCreateCampaign}
          isSubmitting={isActionLoading}
        />

        {/* Campaign List */}
        {loading ? (
          <div className="empty-state">
            <span className="spinner" style={{ width: '32px', height: '32px', marginBottom: '1rem' }} />
            <p>Loading campaigns from BOT Mainnet...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="empty-state">
            <h3>No campaigns found</h3>
            <p>
              {activeTab === 'all'
                ? 'Be the first creator to launch a crowdfunding project on Backr!'
                : `No campaigns in the "${activeTab}" category.`}
            </p>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (!account) {
                  connectWallet();
                } else {
                  setIsFormOpen(true);
                }
              }}
            >
              Start a Campaign
            </button>
          </div>
        ) : (
          <div className="campaign-grid">
            {filteredCampaigns.map((c) => (
              <CampaignCard
                key={c.id.toString()}
                campaign={c}
                nowSec={nowSec}
                connectedAddress={account}
                onSelect={(selected) => setSelectedCampaign(selected)}
              />
            ))}
          </div>
        )}

        {/* Detail Modal */}
        {selectedCampaign && (
          <CampaignDetailModal
            campaign={selectedCampaign}
            nowSec={nowSec}
            userPledge={selectedPledge}
            connectedAddress={account}
            isWrongNetwork={isWrongNetwork}
            onClose={() => setSelectedCampaign(null)}
            onPledge={handlePledge}
            onWithdraw={handleWithdraw}
            onRefund={handleRefund}
            isActionLoading={isActionLoading}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-container">
          {/* Section 1: Proof on bot mainnet */}
          <div className="footer-proof-section">
            <div className="proof-header">
              <span className="proof-badge-dot">●</span>
              <span className="proof-title">Proof on bot mainnet</span>
            </div>
            <div className="proof-grid">
              <div className="proof-item">
                <span className="proof-label">Chain id:</span>
                <span className="proof-value">677</span>
              </div>
              <div className="proof-item">
                <span className="proof-label">Contract:</span>
                <a
                  href={`https://scan.botchain.ai/address/${BACKR_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="proof-link mono"
                >
                  {BACKR_ADDRESS}
                </a>
              </div>
              <div className="proof-item">
                <span className="proof-label">BOT Chain Website:</span>
                <a
                  href="https://www.botchain.ai/en/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="proof-link"
                >
                  https://www.botchain.ai/en/
                </a>
              </div>
              <div className="proof-item">
                <span className="proof-label">BOTScan explorer:</span>
                <a
                  href="https://scan.botchain.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="proof-link"
                >
                  https://scan.botchain.ai/
                </a>
              </div>
            </div>
          </div>

          {/* Section 2: Part of the Ecosystem */}
          <div className="ecosystem-section">
            <div className="ecosystem-card">
              <div className="ecosystem-badge">PART OF THE ECOSYSTEM</div>

              <div className="ecosystem-logo-outer">
                <div className="ecosystem-logo-inner">
                  <img src="/bot-logo.svg" alt="BOT Chain Logo" className="ecosystem-logo-img" />
                </div>
              </div>

              <div className="ecosystem-title">
                <span className="ecosystem-title-bot">BOT</span>{' '}
                <span className="ecosystem-title-chain">Chain</span>
              </div>

              <p className="ecosystem-tagline">Backed, funded, on chain</p>

              <div className="ecosystem-divider">
                <span className="ecosystem-divider-line" />
                <span className="ecosystem-divider-diamond">◆</span>
                <span className="ecosystem-divider-line" />
              </div>

              <div className="ecosystem-links">
                <a
                  href="https://www.botchain.ai/en/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ecosystem-link"
                >
                  <svg
                    className="ecosystem-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                  <span>botchain.ai</span>
                </a>

                <a
                  href="https://scan.botchain.ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ecosystem-link"
                >
                  <svg
                    className="ecosystem-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Explorer</span>
                </a>
              </div>

              <div className="ecosystem-meta">
                &copy; 2026 <strong>BOT Chain</strong> &middot; Mainnet &middot; Chain ID <strong>677</strong>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

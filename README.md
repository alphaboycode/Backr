# Backr 🚀

A decentralized all-or-nothing crowdfunding dapp built with Foundry, Solidity, Vite, React, TypeScript, and viem on **BOT Chain**.

Creators start campaigns with a target goal in native BOT and a duration (1–90 days). Backers pledge native BOT before the deadline.
- If the goal is reached before the deadline: The creator can withdraw the full amount raised (including overfunding).
- If the goal is not reached: Backers can claim a full refund of their pledged BOT.

All campaign data and pledges are stored directly onchain as plain text. No IPFS, no backend, no owner fees, and no upgradeability.

---

## 🌐 Network Information & Deployed Contracts

### BOT Mainnet (Chain ID 677)
- **Network Name:** BOT Mainnet
- **Chain ID:** `677`
- **RPC Endpoint:** `https://rpc.botchain.ai`
- **Native Token:** BOT (150M Total Supply)
- **Contract Address:** [`0x4EB9Ea45A18BE0fB34538Cdf4da80e1F5E360EB3`](https://scan.botchain.ai/address/0x4eb9ea45a18be0fb34538cdf4da80e1f5e360eb3)
- **Deployment Transaction:** [`0x94844dbf5cd88e06d5036f59d755a711e88acf3268a453586b461b29087d422d`](https://scan.botchain.ai/tx/0x94844dbf5cd88e06d5036f59d755a711e88acf3268a453586b461b29087d422d)
- **Verification Status:** Verified on [BOTScan](https://scan.botchain.ai/address/0x4eb9ea45a18be0fb34538cdf4da80e1f5e360eb3)

### BOT Testnet (Chain ID 968)
- **Network Name:** BOT Testnet
- **Chain ID:** `968`
- **RPC Endpoint:** `https://rpc.bohr.life`
- **Contract Address:** [`0x4EB9Ea45A18BE0fB34538Cdf4da80e1F5E360EB3`](https://scan.bohr.life/address/0x4eb9ea45a18be0fb34538cdf4da80e1f5e360eb3)
- **Deployment Transaction:** [`0xeb2f38a742a0f5fd54174e42083d866a62155ac6d10b2c76e91816a409e24158`](https://scan.bohr.life/tx/0xeb2f38a742a0f5fd54174e42083d866a62155ac6d10b2c76e91816a409e24158)
- **Verification:** Verified on [BohrScan](https://scan.bohr.life/address/0x4eb9ea45a18be0fb34538cdf4da80e1f5e360eb3)

---

## Project Structure

```
backr/
├── contracts/               # Foundry smart contract project
│   ├── src/
│   │   └── Backr.sol        # Core crowdfunding contract
│   ├── test/
│   │   ├── Backr.t.sol      # Unit test suite (15 tests)
│   │   └── BackrInvariant.t.sol # Invariant test suite (stateful fuzzing)
│   ├── script/
│   │   └── Deploy.s.sol     # Foundry deployment script
│   └── foundry.toml         # Foundry configuration (solc 0.8.24, RPC)
├── frontend/                # Vite + React + TypeScript + viem frontend
│   ├── src/
│   │   ├── chain.ts         # BOT Testnet viem chain definition
│   │   ├── contracts/       # Deployed address & ABI
│   │   ├── components/      # UI components (Form, Card, Detail Modal)
│   │   ├── App.tsx          # Main single-page application
│   │   └── App.css          # Dark theme styles
│   └── package.json
└── README.md
```

---

## Smart Contract

### Data & Architecture
- **`Campaign` Struct**: `uint256 id`, `address creator`, `string title`, `string description`, `uint256 goal`, `uint64 deadline`, `uint256 totalRaised`, `bool withdrawn`.
- **Campaigns**: Stored in mapping with incrementing IDs starting at `1`.
- **Pledges**: Nested mapping `mapping(uint256 => mapping(address => uint256))`.
- **Status (derived view)**: `Active`, `Successful`, `Failed`.
- **Security**:
  - OpenZeppelin `ReentrancyGuard` (`nonReentrant`) on `pledge`, `withdraw`, and `refund`.
  - Checks-effects-interactions pattern with pull-style transfers.
  - Plain transfers revert (no `receive()` or `fallback()`).
  - Custom errors for gas efficiency and clean error messaging.

---

## Setup & Testing

### 1. Contracts (Foundry)

#### Prerequisites
Install [Foundry](https://getfoundry.sh/):
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### Run Tests
```bash
cd contracts
forge test -vv
```

#### Invariant Testing
The invariant test verifies that contract balance always equals the sum of unwithdrawn, unrefunded pledges across thousands of randomized interactions:
```bash
forge test --match-contract BackrInvariantTest
```

---

## Deployment

Deploy using Foundry script:
```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url https://rpc.bohr.life \
  --account backr \
  --password-file <path-to-password-file> \
  --broadcast
```

Verify source code on BohrScan:
```bash
forge verify-contract <DEPLOYED_ADDRESS> src/Backr.sol:Backr \
  --chain-id 968 \
  --verifier blockscout \
  --verifier-url https://scan.bohr.life/api
```

---

## Running the Frontend

### 1. Install Dependencies
```bash
cd frontend
npm install
```

### 2. Start Dev Server
```bash
npm run dev
```

The application will be live at `http://localhost:5173` (or the port indicated in terminal).

### 3. Build for Production
```bash
npm run build
npm run preview
```

---

## User Guide

1. **Connect Wallet**: Click "Connect Wallet" in the header. If connected to another chain, an option to add/switch to **BOT Testnet** will appear.
2. **Start a Campaign**: Click "+ Start a Campaign". Enter a title (1–100 chars), description (1–1000 chars), funding goal in BOT, and duration (1–90 days). Submit transaction via your wallet.
3. **Pledge**: Select any active campaign and enter the amount of BOT you wish to pledge.
4. **Withdraw (Creator)**: Once the deadline passes and the goal is met, the creator can click "Withdraw Funds" to receive all pledged BOT.
5. **Refund (Backer)**: If the deadline passes without meeting the goal, backers can click "Claim Refund" to retrieve their full pledge.

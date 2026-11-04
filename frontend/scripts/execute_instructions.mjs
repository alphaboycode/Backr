import { createWalletClient, createPublicClient, http, parseEther, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'fs';

// BOT Testnet
const botTestnet = defineChain({
  id: 968,
  name: 'BOT Testnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.bohr.life'] } },
  blockExplorers: { default: { name: 'BohrScan', url: 'https://scan.bohr.life' } },
});

const BACKR_ADDRESS = JSON.parse(fs.readFileSync('./src/contracts/address.json', 'utf8')).address;
const BACKR_ABI = JSON.parse(fs.readFileSync('./src/contracts/Backr.json', 'utf8'));

// Read .env
const envText = fs.readFileSync('./.env', 'utf8');
const getEnvVal = (key) => {
  const match = envText.match(new RegExp(`${key}=(.*)`));
  return match ? match[1].trim() : null;
};

const w1 = privateKeyToAccount(getEnvVal('WALLET_1_PRIVATE_KEY'));
const w2 = privateKeyToAccount(getEnvVal('WALLET_2_PRIVATE_KEY'));
const w3 = privateKeyToAccount(getEnvVal('WALLET_3_PRIVATE_KEY'));

const publicClient = createPublicClient({
  chain: botTestnet,
  transport: http(),
});

function getWalletClient(account) {
  return createWalletClient({
    account,
    chain: botTestnet,
    transport: http(),
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendTx(walletClient, account, fnName, args, value = 0n) {
  console.log(`Sending ${fnName} from ${account.address}...`);
  const hash = await walletClient.writeContract({
    address: BACKR_ADDRESS,
    abi: BACKR_ABI,
    functionName: fnName,
    args,
    value,
    account,
  });
  console.log(`  Tx Hash: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log(`  Confirmed in block ${receipt.blockNumber} (Status: ${receipt.status})`);
  await sleep(1500);
  return { hash, blockNumber: receipt.blockNumber };
}

async function run() {
  console.log('Contract Address:', BACKR_ADDRESS);
  console.log('Wallet 1:', w1.address);
  console.log('Wallet 2:', w2.address);
  console.log('Wallet 3:', w3.address);

  const w1Client = getWalletClient(w1);
  const w2Client = getWalletClient(w2);
  const w3Client = getWalletClient(w3);

  const txLogs = {
    wallet1: [],
    wallet2: [],
    wallet3: [],
  };

  // Phase 1: Create Campaigns
  console.log('\n--- PHASE 1: CREATE CAMPAIGNS ---');

  // W1 Tx 1: Campaign 1
  console.log('\n[Wallet 1 - Tx 1/8] Creating Campaign 1: Clean Water for a Rural School');
  const w1_tx1 = await sendTx(
    w1Client,
    w1,
    'createCampaign',
    [
      'Clean Water for a Rural School',
      'Hundreds of students share a single water source that often breaks down. We’re raising funds to drill a new well, install a solar-powered pump, and add a filtration system so every child has safe drinking water at school.',
      parseEther('1'),
      14n,
    ]
  );
  txLogs.wallet1.push({ action: 'createCampaign (Clean Water)', ...w1_tx1 });

  // W2 Tx 1: Campaign 2
  console.log('\n[Wallet 2 - Tx 1/8] Creating Campaign 2: Help Maria Open Her Neighborhood Bakery');
  const w2_tx1 = await sendTx(
    w2Client,
    w2,
    'createCampaign',
    [
      'Help Maria Open Her Neighborhood Bakery',
      'Maria has been baking custom cakes from her home kitchen for three years. She needs funding for a commercial oven, a mixer, and a small storefront so she can serve more customers and hire two local young people.',
      parseEther('0.5'),
      21n,
    ]
  );
  txLogs.wallet2.push({ action: 'createCampaign (Maria Bakery)', ...w2_tx1 });

  // W3 Tx 1: Campaign 3
  console.log('\n[Wallet 3 - Tx 1/8] Creating Campaign 3: Plant 10,000 Trees for a Greener Community');
  const w3_tx1 = await sendTx(
    w3Client,
    w3,
    'createCampaign',
    [
      'Plant 10,000 Trees for a Greener Community',
      'This volunteer-led reforestation project will plant native trees on degraded land to prevent erosion, restore shade, and create green jobs. Every $1 plants and maintains one tree for its first year, and donors receive photo updates.',
      parseEther('2'),
      30n,
    ]
  );
  txLogs.wallet3.push({ action: 'createCampaign (Plant Trees)', ...w3_tx1 });

  // W1 Tx 2: Campaign 4
  console.log('\n[Wallet 1 - Tx 2/8] Creating Campaign 4: Free Coding Lab for Teens');
  const w1_tx2 = await sendTx(
    w1Client,
    w1,
    'createCampaign',
    [
      'Free Coding Lab for Teens',
      'We want to build a free after-school coding lab with 20 refurbished laptops, reliable internet, and volunteer mentors. Teens aged 13 to 18 will learn web development and build real projects, with no fees and no experience required.',
      parseEther('1.5'),
      28n,
    ]
  );
  txLogs.wallet1.push({ action: 'createCampaign (Coding Lab)', ...w1_tx2 });

  console.log('\n--- PHASE 2: WALLET 1 REMAINING 6 PLEDGES (Total 8 txs) ---');
  // W1 Tx 3: Pledge 0.002 to Camp 2
  const w1_tx3 = await sendTx(w1Client, w1, 'pledge', [2n], parseEther('0.002'));
  txLogs.wallet1.push({ action: 'pledge 0.002 to Camp 2', ...w1_tx3 });

  // W1 Tx 4: Pledge 0.002 to Camp 2
  const w1_tx4 = await sendTx(w1Client, w1, 'pledge', [2n], parseEther('0.002'));
  txLogs.wallet1.push({ action: 'pledge 0.002 to Camp 2', ...w1_tx4 });

  // W1 Tx 5: Pledge 0.002 to Camp 3
  const w1_tx5 = await sendTx(w1Client, w1, 'pledge', [3n], parseEther('0.002'));
  txLogs.wallet1.push({ action: 'pledge 0.002 to Camp 3', ...w1_tx5 });

  // W1 Tx 6: Pledge 0.002 to Camp 3
  const w1_tx6 = await sendTx(w1Client, w1, 'pledge', [3n], parseEther('0.002'));
  txLogs.wallet1.push({ action: 'pledge 0.002 to Camp 3', ...w1_tx6 });

  // W1 Tx 7: Pledge 0.001 to Camp 2
  const w1_tx7 = await sendTx(w1Client, w1, 'pledge', [2n], parseEther('0.001'));
  txLogs.wallet1.push({ action: 'pledge 0.001 to Camp 2', ...w1_tx7 });

  // W1 Tx 8: Pledge 0.001 to Camp 3
  const w1_tx8 = await sendTx(w1Client, w1, 'pledge', [3n], parseEther('0.001'));
  txLogs.wallet1.push({ action: 'pledge 0.001 to Camp 3', ...w1_tx8 });

  console.log('\n--- PHASE 3: WALLET 2 REMAINING 7 PLEDGES (Total 8 txs) ---');
  // W2 Tx 2: Pledge 0.002 to Camp 1
  const w2_tx2 = await sendTx(w2Client, w2, 'pledge', [1n], parseEther('0.002'));
  txLogs.wallet2.push({ action: 'pledge 0.002 to Camp 1', ...w2_tx2 });

  // W2 Tx 3: Pledge 0.002 to Camp 1
  const w2_tx3 = await sendTx(w2Client, w2, 'pledge', [1n], parseEther('0.002'));
  txLogs.wallet2.push({ action: 'pledge 0.002 to Camp 1', ...w2_tx3 });

  // W2 Tx 4: Pledge 0.002 to Camp 3
  const w2_tx4 = await sendTx(w2Client, w2, 'pledge', [3n], parseEther('0.002'));
  txLogs.wallet2.push({ action: 'pledge 0.002 to Camp 3', ...w2_tx4 });

  // W2 Tx 5: Pledge 0.002 to Camp 3
  const w2_tx5 = await sendTx(w2Client, w2, 'pledge', [3n], parseEther('0.002'));
  txLogs.wallet2.push({ action: 'pledge 0.002 to Camp 3', ...w2_tx5 });

  // W2 Tx 6: Pledge 0.002 to Camp 4
  const w2_tx6 = await sendTx(w2Client, w2, 'pledge', [4n], parseEther('0.002'));
  txLogs.wallet2.push({ action: 'pledge 0.002 to Camp 4', ...w2_tx6 });

  // W2 Tx 7: Pledge 0.002 to Camp 4
  const w2_tx7 = await sendTx(w2Client, w2, 'pledge', [4n], parseEther('0.002'));
  txLogs.wallet2.push({ action: 'pledge 0.002 to Camp 4', ...w2_tx7 });

  // W2 Tx 8: Pledge 0.001 to Camp 1
  const w2_tx8 = await sendTx(w2Client, w2, 'pledge', [1n], parseEther('0.001'));
  txLogs.wallet2.push({ action: 'pledge 0.001 to Camp 1', ...w2_tx8 });

  console.log('\n--- PHASE 4: WALLET 3 REMAINING 7 PLEDGES (Total 8 txs) ---');
  // W3 Tx 2: Pledge 0.002 to Camp 1
  const w3_tx2 = await sendTx(w3Client, w3, 'pledge', [1n], parseEther('0.002'));
  txLogs.wallet3.push({ action: 'pledge 0.002 to Camp 1', ...w3_tx2 });

  // W3 Tx 3: Pledge 0.002 to Camp 1
  const w3_tx3 = await sendTx(w3Client, w3, 'pledge', [1n], parseEther('0.002'));
  txLogs.wallet3.push({ action: 'pledge 0.002 to Camp 1', ...w3_tx3 });

  // W3 Tx 4: Pledge 0.002 to Camp 2
  const w3_tx4 = await sendTx(w3Client, w3, 'pledge', [2n], parseEther('0.002'));
  txLogs.wallet3.push({ action: 'pledge 0.002 to Camp 2', ...w3_tx4 });

  // W3 Tx 5: Pledge 0.002 to Camp 2
  const w3_tx5 = await sendTx(w3Client, w3, 'pledge', [2n], parseEther('0.002'));
  txLogs.wallet3.push({ action: 'pledge 0.002 to Camp 2', ...w3_tx5 });

  // W3 Tx 6: Pledge 0.002 to Camp 4
  const w3_tx6 = await sendTx(w3Client, w3, 'pledge', [4n], parseEther('0.002'));
  txLogs.wallet3.push({ action: 'pledge 0.002 to Camp 4', ...w3_tx6 });

  // W3 Tx 7: Pledge 0.002 to Camp 4
  const w3_tx7 = await sendTx(w3Client, w3, 'pledge', [4n], parseEther('0.002'));
  txLogs.wallet3.push({ action: 'pledge 0.002 to Camp 4', ...w3_tx7 });

  // W3 Tx 8: Pledge 0.001 to Camp 2
  const w3_tx8 = await sendTx(w3Client, w3, 'pledge', [2n], parseEther('0.001'));
  txLogs.wallet3.push({ action: 'pledge 0.001 to Camp 2', ...w3_tx8 });

  console.log('\n=== ALL TRANSACTIONS COMPLETED ===');
  console.log('Wallet 1 total txs:', txLogs.wallet1.length);
  console.log('Wallet 2 total txs:', txLogs.wallet2.length);
  console.log('Wallet 3 total txs:', txLogs.wallet3.length);

  fs.writeFileSync('./execution_summary.json', JSON.stringify(txLogs, null, 2));
  console.log('Summary saved to execution_summary.json');
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

import { createPublicClient, http } from 'viem';
import { botTestnet } from '../chain';
import addressData from './address.json';
import { BACKR_ABI } from './BackrABI';

export const BACKR_ADDRESS = addressData.address as `0x${string}`;

export const publicClient = createPublicClient({
  chain: botTestnet,
  transport: http(),
});

export { BACKR_ABI };

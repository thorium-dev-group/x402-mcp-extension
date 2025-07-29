// X402PKWalletProvider: WalletProvider implementation that creates a viem LocalAccount from a private key
import { privateKeyToAccount } from 'viem/accounts';
import type { LocalAccount } from 'viem';
import type { IWalletProvider } from '../shared/interfaces';

export class X402PKWalletProvider implements IWalletProvider {
  private privateKey: string;
  private account: LocalAccount;

  constructor(privateKey: string) {
    this.privateKey = privateKey;
    this.account = privateKeyToAccount(this.privateKey as `0x${string}`);
  }

  async createAccount(): Promise<LocalAccount> {
    return this.account;
  }
} 
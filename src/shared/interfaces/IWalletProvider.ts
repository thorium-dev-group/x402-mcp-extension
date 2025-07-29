
import {LocalAccount} from 'viem';

export interface IWalletProvider {
    /** Creates and returns a viem LocalAccount for signing */
    createAccount(): Promise<LocalAccount>;
  }
import { ethers } from 'ethers';

class EnsService {
  private static instance: EnsService;
  private provider: ethers.Provider;
  private ensCache: Map<string, string>; // Cache for address -> ENS name
  private addressCache: Map<string, string>; // Cache for ENS name -> address (for reverse lookup if needed)

  private constructor() {
    // Initialize with a default provider. For production, consider a more robust setup
    // like Infura, Alchemy, or a custom RPC endpoint.
    // For now, using a public provider for simplicity.
    this.provider = ethers.getDefaultProvider('mainnet');
    this.ensCache = new Map();
    this.addressCache = new Map();
    console.log('[EnsService] Initialized with default provider.');
  }

  public static getInstance(): EnsService {
    if (!EnsService.instance) {
      EnsService.instance = new EnsService();
    }
    return EnsService.instance;
  }

  /**
   * Resolves an ENS name to an address.
   * @param ensName The ENS name to resolve (e.g., 'vitalik.eth').
   * @returns The resolved address or null if not found.
   */
  public async resolveEnsName(ensName: string): Promise<string | null> {
    if (this.addressCache.has(ensName)) {
      return this.addressCache.get(ensName)!;
    }
    try {
      const address = await this.provider.resolveName(ensName);
      if (address) {
        this.addressCache.set(ensName, address);
        this.ensCache.set(address, ensName); // Also cache reverse lookup
      }
      return address;
    } catch (error) {
      console.error(`[EnsService] Error resolving ENS name ${ensName}:`, error);
      return null;
    }
  }

  /**
   * Looks up the ENS name for a given address (reverse lookup).
   * @param address The wallet address to lookup (e.g., '0x...').
   * @returns The ENS name or null if not found.
   */
  public async lookupEnsAddress(address: string): Promise<string | null> {
    if (this.ensCache.has(address)) {
      return this.ensCache.get(address)!;
    }
    
    // Validate that we have a full address (not truncated)
    if (!address || address.length < 42 || !address.startsWith('0x')) {
      console.warn(`[EnsService] Invalid or truncated address provided: ${address}. Skipping ENS lookup.`);
      return null;
    }
    
    try {
      const ensName = await this.provider.lookupAddress(address);
      if (ensName) {
        this.ensCache.set(address, ensName);
        this.addressCache.set(ensName, address); // Also cache forward lookup
      }
      return ensName;
    } catch (error) {
      console.error(`[EnsService] Error looking up ENS address ${address}:`, error);
      return null;
    }
  }

  /**
   * Formats an address or ENS name for display.
   * Prioritizes ENS name if available, otherwise truncates the address.
   * @param address The wallet address.
   * @returns The formatted string (ENS name or truncated address).
   */
  public async formatAddressOrEns(address: string): Promise<string> {
    if (!address) {
      return 'Unknown';
    }

    // Check if it's already an ENS name in our cache (unlikely for input, but good for consistency)
    if (this.addressCache.has(address) && this.addressCache.get(address) === address) {
        return address; // It's an ENS name that resolves to itself (e.g., "vitalik.eth")
    }

    // Try to get ENS name from cache first
    let ensName = this.ensCache.get(address);

    if (!ensName) {
      // If not in cache, try to look it up
      ensName = await this.lookupEnsAddress(address);
    }

    if (ensName) {
      return ensName;
    } else {
      // Fallback to truncated address
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
  }
}

export const ensService = EnsService.getInstance();

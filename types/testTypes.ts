interface PhaseType {
  name: string;
  price: bigint;
  maxMintPerAddress: number;
  maxSupply: number;
}

export interface E2ETestConfigType {
  maxMintPerTransaction: number;
  collectionMaxSupply: number;
  maxSupplyForDev: number;
  rootSignerAddress: string;
  baseURI: string;
  unRevealedUri: string;
  phases: Record<string, PhaseType>;
}

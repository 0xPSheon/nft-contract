interface PhaseType {
  name: string;
  price: bigint;
  maxMintPerAddress: bigint;
  maxSupply: bigint;
}

export interface E2ETestConfigType {
  maxMintPerTransaction: bigint;
  collectionMaxSupply: bigint;
  maxSupplyForDev: bigint;
  rootSignerAddress: string;
  baseURI: string;
  unRevealedUri: string;
  phases: Record<string, PhaseType>;
}

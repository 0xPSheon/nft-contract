# NFT Contract

## Sign method

1. Contract Name
2. Owner Address
3. Phase Name

```typescript
{ type: "string", value: contractName },
{ type: "address", value: ownerAddress },
{ type: "string", value: phaseName }
```

## ERC721A version test process

1. Deploy to `goerli` network
   - npx hardhat run --network goerli scripts/deploy.ts
2. Record the contract address
   - CONTRACT_ADDRESS ()
3. Verify the contract via etherscan
   - npx hardhat verify --network goerli CONTRACT_ADDRESS
4. Call `initialize` function
   - rootSigner: ()
   - baseURI: ()
   - unrevealedURI: ()
   - currentPhaseName: Initialize
   - currentPhasePrice: 0
   - currentPhaseMaxMintPerAddress: 0
   - currentPhaseMaxSupply: 20
5. Airdrop Team Card
   - receiver: RECEIVER_ADDRESS
   - quantity: AMOUNT
6. Set `Free Mint` phase
   - currentPhaseName: Free Mint
   - currentPhasePrice: 0 (0 Ether)
   - currentPhaseMaxMintPerAddress: 5
   - currentPhaseMaxSupply: 1000
7. Manual mint 5 cards
8. Set `Public Sale` phase
   - currentPhaseName: Public Sale
   - currentPhasePrice: 2000000000000000 (0.002 Ether)
   - currentPhaseMaxMintPerAddress: 10
   - currentPhaseMaxSupply: 4000
9. Update whitelist in backend
10. Update images in backend
11. Withdraw

## ERC721A version contract API

| name                | description                         | admin only |
| ------------------- | ----------------------------------- | :--------: |
| setRootSigner       | set root signer for verify function |     ✅     |
| reveal              | reveal NFT                          |     ✅     |
| setBaseURI          | set NFT metadata base URI           |     ✅     |
| setExtension        | set NFT metadata URI extension      |     ✅     |
| setUnrevealURI      | set NFT metadata unreveal URI       |     ✅     |
| setPhase            | set a new phase                     |     ✅     |
| setPhasePrice       | set price in current phase          |     ✅     |
| initialize          | initialize the contract             |     ✅     |
| tokenURI            | get NFT token metadata              |            |
| isValidSignature    | check signature is valid            |            |
| mintCards           | mint                                |            |
| mintCardsForAddress | airdrop function                    |     ✅     |
| numberMinted        | get address mint count              |            |
| getOwnershipData    | get token owner by id               |            |
| withdraw            | withdraw                            |     ✅     |

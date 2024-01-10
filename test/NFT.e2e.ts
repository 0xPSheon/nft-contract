// ** Hardhat Imports
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

// ** Helper Imports
import { backendSign } from "./helpers";

// ** Types
import type {
  Address,
  WalletClient,
  PublicClient as ViemPublicClient,
} from "viem";
import type { E2ETestConfigType } from "../types/testTypes";

// ****************
// ** E2E Config **
// ****************
const config: E2ETestConfigType = {
  maxMintPerTransaction: 5,
  collectionMaxSupply: 40,
  maxSupplyForDev: 15,
  rootSignerAddress: process.env.ROOT_SIGNER_ADDRESS as string,
  baseURI: "ipfs://QmTecK6aZLBteHcx7zP7jCgWELFwkPPgF4aWBJmB7RJnDg/",
  unRevealedUri: "ipfs://QmeUBYxjyWkmySSosnXh4bSTYrenb996Zy6VvmkggT5Qgu/0.png",
  phases: {
    Initialize: {
      name: "Initialize",
      price: parseEther("0.05"),
      maxMintPerAddress: 0,
      maxSupply: 0,
    },
    "Free Mint": {
      name: "Free Mint",
      price: parseEther("0"),
      maxMintPerAddress: 5,
      maxSupply: 15,
    },
    "Public Sale": {
      name: "Public Sale",
      price: parseEther("0.5"),
      maxMintPerAddress: 5,
      maxSupply: 10,
    },
  },
};

// ** Variables
let owner: WalletClient;
let addrTeam01: WalletClient;
let addrTeam02: WalletClient;
let addrFree01: WalletClient;
let addrFree02: WalletClient;
let addrPub01: WalletClient;
let addrPub02: WalletClient;
let addrPub03: WalletClient;
let addrBeneficiary: WalletClient;
let PublicClient: ViemPublicClient;
let MainContract: any;

describe("NFT contract", function () {
  before(async () => {
    const [
      currentOwner,
      currentAddr01,
      currentAddr02,
      currentAddr03,
      currentAddr04,
      currentAddr05,
      currentAddr06,
      currentAddr07,
      currentAddr08,
    ] = await hre.viem.getWalletClients();
    const currentMainContract = await hre.viem.deployContract("NFT", [
      config.maxMintPerTransaction,
      config.collectionMaxSupply,
      config.maxSupplyForDev,
    ]);
    const publicClient = await hre.viem.getPublicClient();

    owner = currentOwner;
    addrTeam01 = currentAddr01;
    addrTeam02 = currentAddr02;
    addrFree01 = currentAddr03;
    addrFree02 = currentAddr04;
    addrPub01 = currentAddr05;
    addrPub02 = currentAddr06;
    addrPub03 = currentAddr07;
    addrBeneficiary = currentAddr08;
    PublicClient = publicClient;
    MainContract = currentMainContract;
  });

  async function getConnectedClientContract(client: WalletClient) {
    const connectedContract = await hre.viem.getContractAt(
      "NFT",
      MainContract.address,
      {
        walletClient: client,
      }
    );

    return connectedContract;
  }

  describe("Deployment", async () => {
    it("Deployer is owner", async () => {
      expect(await MainContract.read.owner()).to.equal(
        getAddress(owner.account!.address)
      );
    });

    it("should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await MainContract.read.balanceOf([
        owner.account!.address,
      ]);
      expect(await MainContract.read.totalSupply()).to.equal(ownerBalance);
    });

    it("has expected name and symbol", async function () {
      expect(await MainContract.read.name()).to.equal("NFT");
      expect(await MainContract.read.symbol()).to.equal("NFT");
    });

    it("has correct address limitation during mint", async function () {
      expect(await MainContract.read.maxMintPerTx()).to.equal(
        BigInt(config.maxMintPerTransaction)
      );
    });

    it("has correct collection size", async function () {
      expect(await MainContract.read.collectionMaxSupply()).to.equal(
        BigInt(config.collectionMaxSupply)
      );
    });

    it("has correct max supply for dev", async function () {
      expect(await MainContract.read.maxSupplyForDev()).to.equal(
        BigInt(config.maxSupplyForDev)
      );
    });

    it("should not set phase information", async function () {
      expect(await MainContract.read.currentPhaseName()).to.equal("Preparing");
      expect(await MainContract.read.currentPhasePrice()).to.equal(BigInt(0));
    });

    it("should not able to airdrop before initialization", async function () {
      await expect(
        MainContract.write.mintCardsForAddress([
          addrBeneficiary.account!.address,
          config.maxSupplyForDev,
        ])
      ).to.be.rejectedWith("Not initialized");
    });

    it("should initialize the environment with correct parameters", async function () {
      expect(
        MainContract.write.initialize([
          config.rootSignerAddress,
          config.baseURI,
        ])
      ).to.be.rejected;
      expect(
        MainContract.write.initialize([
          config.rootSignerAddress,
          config.baseURI,
          config.unRevealedUri,
        ])
      ).to.be.rejected;

      await MainContract.write.initialize([
        config.rootSignerAddress,
        config.baseURI,
        config.unRevealedUri,
        config.phases.Initialize.name,
        config.phases.Initialize.price,
        config.phases.Initialize.maxMintPerAddress,
        config.phases.Initialize.maxSupply,
      ]);

      expect(await MainContract.read.baseURI()).to.equal(config.baseURI);
      expect(await MainContract.read.currentPhaseName()).to.equal(
        config.phases.Initialize.name
      );
      expect(await MainContract.read.currentPhasePrice()).to.equal(
        config.phases.Initialize.price
      );
      expect(await MainContract.read.currentPhaseMaxMintPerAddress()).to.equal(
        BigInt(config.phases.Initialize.maxMintPerAddress)
      );
      expect(await MainContract.read.currentPhaseMaxSupply()).to.equal(
        BigInt(config.phases.Initialize.maxSupply)
      );
    });

    it("should only initialize once", async function () {
      await expect(
        MainContract.write.initialize([
          config.rootSignerAddress,
          config.baseURI,
          config.unRevealedUri,
          config.phases.Initialize.name,
          config.phases.Initialize.price,
          config.phases.Initialize.maxMintPerAddress,
          config.phases.Initialize.maxSupply,
        ])
      ).to.be.rejectedWith("Initialization can only be done once");
    });

    it("should able to airdrop with correct quantity", async function () {
      await expect(
        MainContract.write.mintCardsForAddress([
          addrTeam01.account!.address,
          config.maxSupplyForDev + config.maxMintPerTransaction,
        ])
      ).to.be.rejectedWith("Too many already minted before dev mint");
      await expect(
        MainContract.write.mintCardsForAddress([
          addrTeam01.account!.address,
          config.maxSupplyForDev - 1,
        ])
      ).to.be.rejectedWith("Can only mint a multiple of the maxBatchSize");

      await MainContract.write.mintCardsForAddress([
        addrTeam01.account!.address,
        config.maxSupplyForDev,
      ]);

      await expect(
        MainContract.write.mintCardsForAddress([addrTeam01.account!.address, 1])
      ).to.be.rejectedWith("Too many already minted before dev mint");

      expect(await MainContract.read.ownerOf([1])).to.equal(
        getAddress(addrTeam01.account!.address)
      );
      expect(await MainContract.read.ownerOf([15])).to.equal(
        getAddress(addrTeam01.account!.address)
      );
      expect(
        await MainContract.read.numberMinted([addrTeam01.account!.address])
      ).to.equal(BigInt(config.maxSupplyForDev));
      expect(await MainContract.read.totalSupply()).to.equal(
        BigInt(config.maxSupplyForDev)
      );
    });
  });

  describe("Free Mint Stage", async () => {
    it("should not able to mint before setting free mint phase", async function () {
      const { signature: addrFree01Sign } = await backendSign(
        await MainContract.read.name(),
        addrFree01.account!.address,
        "Free Mint"
      );
      const ConnectedFree01MainContract = await getConnectedClientContract(
        addrFree01
      );

      await expect(
        ConnectedFree01MainContract.write.mintCards([addrFree01Sign, 1])
      ).to.be.rejectedWith("Not authorized");
    });

    it("should update phase with data", async function () {
      await MainContract.write.setPhase([
        config.phases["Free Mint"].name,
        config.phases["Free Mint"].price,
        config.phases["Free Mint"].maxMintPerAddress,
        config.phases["Free Mint"].maxSupply,
      ]);
      await expect(await MainContract.read.currentPhaseName()).to.be.equal(
        config.phases["Free Mint"].name
      );
      await expect(await MainContract.read.currentPhasePrice()).to.be.equal(
        config.phases["Free Mint"].price
      );
      await expect(
        await MainContract.read.currentPhaseMaxMintPerAddress()
      ).to.be.equal(BigInt(config.phases["Free Mint"].maxMintPerAddress));
      await expect(await MainContract.read.currentPhaseMaxSupply()).to.be.equal(
        BigInt(config.phases["Free Mint"].maxSupply)
      );
    });

    it("should not able to mint public", async function () {
      const amount = 1;
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedFreee01MainContract = await getConnectedClientContract(
        addrFree01
      );

      await expect(
        ConnectedFreee01MainContract.write.mintCardsPublic([amount])
      ).to.be.rejectedWith("Not public phase");
      await expect(
        ConnectedFreee01MainContract.write.mintCardsPublic([amount], {
          value: price * BigInt(amount),
        })
      ).to.be.rejectedWith("Not public phase");
    });

    it("should able to mint with correct signature and total supply should be update", async function () {
      const amount = 1;
      const currentPhaseName = await MainContract.read.currentPhaseName();
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedFreee01MainContract = await getConnectedClientContract(
        addrFree01
      );
      const ConnectedFreee02MainContract = await getConnectedClientContract(
        addrFree02
      );
      const { signature: addrFreee01Sign } = await backendSign(
        await MainContract.read.name(),
        addrFree01.account!.address,
        currentPhaseName
      );
      const { signature: addrFreee02Sign } = await backendSign(
        await MainContract.read.name(),
        addrFree02.account!.address,
        currentPhaseName
      );

      await ConnectedFreee01MainContract.write.mintCards(
        [addrFreee01Sign, amount],
        {
          value: price * BigInt(amount),
        }
      );
      await ConnectedFreee02MainContract.write.mintCards(
        [addrFreee02Sign, amount],
        {
          value: price * BigInt(amount),
        }
      );

      expect(await MainContract.read.ownerOf([16])).to.equal(
        getAddress(addrFree01.account!.address)
      );
      expect(await MainContract.read.ownerOf([17])).to.equal(
        getAddress(addrFree02.account!.address)
      );
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(17));
    });

    it("should able to bulk mint with correct signature and total supply should be update", async function () {
      const amount = 4;
      const currentPhaseName = await MainContract.read.currentPhaseName();
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedFreee01MainContract = await getConnectedClientContract(
        addrFree01
      );
      const ConnectedFreee02MainContract = await getConnectedClientContract(
        addrFree02
      );
      const { signature: addrFreee01Sign } = await backendSign(
        await MainContract.read.name(),
        addrFree01.account!.address,
        currentPhaseName
      );
      const { signature: addrFreee02Sign } = await backendSign(
        await MainContract.read.name(),
        addrFree02.account!.address,
        currentPhaseName
      );

      await expect(
        ConnectedFreee01MainContract.write.mintCards(
          [addrFreee01Sign, amount + 1],
          {
            value: price * BigInt(amount + 1),
          }
        )
      ).to.be.rejectedWith("Over phase limit");
      await ConnectedFreee01MainContract.write.mintCards(
        [addrFreee01Sign, amount],
        {
          value: price * BigInt(amount),
        }
      );

      await expect(
        ConnectedFreee02MainContract.write.mintCards(
          [addrFreee02Sign, amount + 1],
          {
            value: price * BigInt(amount + 1),
          }
        )
      ).to.be.rejectedWith("Over phase limit");
      await ConnectedFreee02MainContract.write.mintCards(
        [addrFreee02Sign, amount],
        {
          value: price * BigInt(amount),
        }
      );
      expect(await MainContract.read.ownerOf([18])).to.equal(
        getAddress(addrFree01.account!.address)
      );
      expect(await MainContract.read.ownerOf([19])).to.equal(
        getAddress(addrFree01.account!.address)
      );
      expect(await MainContract.read.ownerOf([20])).to.equal(
        getAddress(addrFree01.account!.address)
      );
      expect(await MainContract.read.ownerOf([21])).to.equal(
        getAddress(addrFree01.account!.address)
      );
      expect(await MainContract.read.ownerOf([22])).to.equal(
        getAddress(addrFree02.account!.address)
      );
      expect(await MainContract.read.ownerOf([23])).to.equal(
        getAddress(addrFree02.account!.address)
      );
      expect(await MainContract.read.ownerOf([24])).to.equal(
        getAddress(addrFree02.account!.address)
      );
      expect(await MainContract.read.ownerOf([25])).to.equal(
        getAddress(addrFree02.account!.address)
      );
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(25));
    });

    it("should not able to mint after reach address cap even sending NFT to another address", async function () {
      const amount = 1;
      const currentPhaseName = await MainContract.read.currentPhaseName();
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedFree01MainContract = await getConnectedClientContract(
        addrFree01
      );
      const { signature: addrFree01Sign } = await backendSign(
        await MainContract.read.name(),
        addrFree01.account!.address,
        currentPhaseName
      );
      const Free01FirstTokenIndex = await MainContract.read.tokenOfOwnerByIndex(
        [addrFree01.account!.address, 0]
      );

      await ConnectedFree01MainContract.write.transferFrom([
        addrFree01.account!.address,
        addrFree02.account!.address,
        Free01FirstTokenIndex,
      ]);

      expect(await MainContract.read.ownerOf([Free01FirstTokenIndex])).to.equal(
        getAddress(addrFree02.account!.address)
      );

      await expect(
        ConnectedFree01MainContract.write.mintCards([addrFree01Sign, amount], {
          value: price * BigInt(amount),
        })
      ).to.be.rejectedWith("Over phase limit");
      expect(
        await MainContract.read.balanceOf([addrFree01.account!.address])
      ).to.equal(BigInt(4));
      expect(
        await MainContract.read.balanceOf([addrFree02.account!.address])
      ).to.equal(BigInt(6));
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(25));
    });

    it("should be refunded when overpaid", async function () {
      const amount = 5;
      const currentPhaseName = await MainContract.read.currentPhaseName();
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedTeam02MainContract = await getConnectedClientContract(
        addrTeam02
      );
      const { signature: addrTeam02Sign } = await backendSign(
        await MainContract.read.name(),
        addrTeam02.account!.address,
        currentPhaseName
      );

      const team02OriginBalance = await PublicClient.getBalance({
        address: addrTeam02.account!.address,
      });
      const hash = await ConnectedTeam02MainContract.write.mintCards(
        [addrTeam02Sign, amount],
        {
          value: parseEther("1"),
        }
      );
      const { cumulativeGasUsed, effectiveGasPrice } =
        await PublicClient.waitForTransactionReceipt({
          hash,
        });

      expect(await MainContract.read.ownerOf([26])).to.equal(
        getAddress(addrTeam02.account!.address)
      );
      expect(await MainContract.read.ownerOf([27])).to.equal(
        getAddress(addrTeam02.account!.address)
      );
      expect(await MainContract.read.ownerOf([28])).to.equal(
        getAddress(addrTeam02.account!.address)
      );
      expect(await MainContract.read.ownerOf([29])).to.equal(
        getAddress(addrTeam02.account!.address)
      );
      expect(await MainContract.read.ownerOf([30])).to.equal(
        getAddress(addrTeam02.account!.address)
      );

      expect(
        await PublicClient.getBalance({
          address: addrTeam02.account!.address,
        })
      ).to.equal(
        team02OriginBalance -
          price * BigInt(amount) -
          cumulativeGasUsed * effectiveGasPrice
      );
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(30));
    });

    it("should get correct balance", async function () {
      const balanceOfContract = await PublicClient.getBalance({
        address: MainContract.address,
      });
      const expectedBalance = config.phases["Free Mint"].price * BigInt(15);

      expect(balanceOfContract).to.equal(BigInt(expectedBalance));
    });
  });

  describe("Public Sale Stage", async () => {
    it("should not able to mint before setting phase", async function () {
      const ConnectedPub01MainContract = await getConnectedClientContract(
        addrPub01
      );
      const { signature: wrongSign } = await backendSign(
        await MainContract.read.name(),
        addrPub01.account!.address,
        "Public Sale"
      );
      await expect(
        ConnectedPub01MainContract.write.mintCards([wrongSign, 1])
      ).to.be.rejectedWith("Not authorized");
      await expect(
        ConnectedPub01MainContract.write.mintCardsPublic([1])
      ).to.be.rejectedWith("Not public phase");
    });

    it("should update phase with data", async function () {
      await MainContract.write.setPhase([
        config.phases["Public Sale"].name,
        config.phases["Public Sale"].price,
        config.phases["Public Sale"].maxMintPerAddress,
        config.phases["Public Sale"].maxSupply,
      ]);

      await expect(await MainContract.read.currentPhaseName()).to.be.equal(
        config.phases["Public Sale"].name
      );
      await expect(await MainContract.read.currentPhasePrice()).to.be.equal(
        config.phases["Public Sale"].price
      );
      await expect(
        await MainContract.read.currentPhaseMaxMintPerAddress()
      ).to.be.equal(BigInt(config.phases["Public Sale"].maxMintPerAddress));
      await expect(await MainContract.read.currentPhaseMaxSupply()).to.be.equal(
        BigInt(config.phases["Public Sale"].maxSupply)
      );
    });

    it("should not able mint with backend sign", async function () {
      const amount = 1;
      const currentPhaseName = await MainContract.read.currentPhaseName();
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedPub01MainContract = await getConnectedClientContract(
        addrPub01
      );
      const { signature: addrPub01Sign } = await backendSign(
        await MainContract.read.name(),
        addrPub01.account!.address,
        currentPhaseName
      );

      await expect(
        ConnectedPub01MainContract.write.mintCards([addrPub01Sign, amount])
      ).to.be.rejectedWith("Not legal phase");
      await expect(
        ConnectedPub01MainContract.write.mintCards([addrPub01Sign, amount], {
          value: price * BigInt(amount),
        })
      ).to.be.rejectedWith("Not legal phase");
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(30));
    });

    it("should able to mint and total supply should be update", async function () {
      const amount = 1;
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedPub01MainContract = await getConnectedClientContract(
        addrPub01
      );
      const ConnectedPub02MainContract = await getConnectedClientContract(
        addrPub02
      );

      await expect(
        ConnectedPub01MainContract.write.mintCardsPublic([amount])
      ).to.be.rejectedWith("Not enough ether sent");
      await expect(
        ConnectedPub02MainContract.write.mintCardsPublic([amount])
      ).to.be.rejectedWith("Not enough ether sent");

      await ConnectedPub01MainContract.write.mintCardsPublic([amount], {
        value: price * BigInt(amount),
      });
      await ConnectedPub02MainContract.write.mintCardsPublic([amount], {
        value: price * BigInt(amount),
      });

      expect(await MainContract.read.ownerOf([31])).to.equal(
        getAddress(addrPub01.account!.address)
      );
      expect(await MainContract.read.ownerOf([32])).to.equal(
        getAddress(addrPub02.account!.address)
      );
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(32));
    });

    it("should able to bulk mint and total supply should be update", async function () {
      const amount = 4;
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedPub01MainContract = await getConnectedClientContract(
        addrPub01
      );
      const ConnectedPub02MainContract = await getConnectedClientContract(
        addrPub02
      );

      await expect(
        ConnectedPub01MainContract.write.mintCardsPublic([amount])
      ).to.be.rejectedWith("Not enough ether sent");
      await expect(
        ConnectedPub01MainContract.write.mintCardsPublic([amount + 1], {
          value: price * BigInt(amount + 1),
        })
      ).to.be.rejectedWith("Over phase limit");
      await expect(
        ConnectedPub02MainContract.write.mintCardsPublic([amount])
      ).to.be.rejectedWith("Not enough ether sent");
      await expect(
        ConnectedPub02MainContract.write.mintCardsPublic([amount + 1], {
          value: price * BigInt(amount + 1),
        })
      ).to.be.rejectedWith("Over phase limit");

      await ConnectedPub01MainContract.write.mintCardsPublic([amount], {
        value: price * BigInt(amount),
      });
      await ConnectedPub02MainContract.write.mintCardsPublic([amount], {
        value: price * BigInt(amount),
      });

      expect(await MainContract.read.ownerOf([33])).to.equal(
        getAddress(addrPub01.account!.address)
      );
      expect(await MainContract.read.ownerOf([34])).to.equal(
        getAddress(addrPub01.account!.address)
      );
      expect(await MainContract.read.ownerOf([35])).to.equal(
        getAddress(addrPub01.account!.address)
      );
      expect(await MainContract.read.ownerOf([36])).to.equal(
        getAddress(addrPub01.account!.address)
      );
      expect(await MainContract.read.ownerOf([37])).to.equal(
        getAddress(addrPub02.account!.address)
      );
      expect(await MainContract.read.ownerOf([38])).to.equal(
        getAddress(addrPub02.account!.address)
      );
      expect(await MainContract.read.ownerOf([39])).to.equal(
        getAddress(addrPub02.account!.address)
      );
      expect(await MainContract.read.ownerOf([40])).to.equal(
        getAddress(addrPub02.account!.address)
      );
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(40));
    });

    it("should not able to mint after reach address cap even sending NFT to another address", async function () {
      const amount = 1;
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedPub01MainContract = await getConnectedClientContract(
        addrPub01
      );

      const og01FirstTokenIndex = await MainContract.read.tokenOfOwnerByIndex([
        addrPub01.account!.address,
        0,
      ]);

      await ConnectedPub01MainContract.write.transferFrom([
        addrPub01.account!.address,
        addrPub02.account!.address,
        og01FirstTokenIndex,
      ]);

      expect(await MainContract.read.ownerOf([og01FirstTokenIndex])).to.equal(
        getAddress(addrPub02.account!.address)
      );
      await expect(
        ConnectedPub01MainContract.write.mintCardsPublic([amount], {
          value: price * BigInt(amount),
        })
      ).to.be.rejectedWith("Over phase limit");
      expect(
        await MainContract.read.balanceOf([addrPub01.account!.address])
      ).to.equal(BigInt(4));
      expect(
        await MainContract.read.balanceOf([addrPub02.account!.address])
      ).to.equal(BigInt(6));
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(40));
    });

    it("should not able to mint after reach collection cap", async function () {
      const amount = 1;
      const price = await MainContract.read.currentPhasePrice();
      const ConnectedPub01MainContract = await getConnectedClientContract(
        addrPub01
      );

      await expect(
        ConnectedPub01MainContract.write.mintCardsPublic([amount])
      ).to.be.rejectedWith("Not enough ether sent");
      await expect(
        ConnectedPub01MainContract.write.mintCardsPublic([amount], {
          value: price * BigInt(amount),
        })
      ).to.be.rejectedWith("Over phase limit");
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(40));
    });

    it("should not able to airdrop after reach collection cap", async function () {
      const amount = 1;

      await expect(
        MainContract.write.mintCardsForAddress([
          addrPub03.account!.address,
          amount,
        ])
      ).to.be.rejectedWith("Too many already minted before dev mint");
      expect(await MainContract.read.totalSupply()).to.equal(BigInt(40));
    });

    it("should get correct balance", async function () {
      const balanceOfContract = await PublicClient.getBalance({
        address: MainContract.address,
      });
      const expectedBalance =
        config.phases["Free Mint"].price * BigInt(15) +
        config.phases["Public Sale"].price * BigInt(10);

      expect(balanceOfContract).to.equal(BigInt(expectedBalance));
    });
  });

  describe("Manual", async function () {
    it("should update base uri", async function () {
      const newBaseURI = "ipfs://updated/";

      await MainContract.write.setBaseURI([newBaseURI]);

      expect(await MainContract.read.baseURI()).to.equal(newBaseURI);
    });

    it("should update root signer", async function () {
      const newRootSignerPrivateKey = await generatePrivateKey();
      const newRootSignerAccount = privateKeyToAccount(newRootSignerPrivateKey);

      await MainContract.write.setRootSigner([newRootSignerAccount.address]);

      const { messageHash, signature } = await backendSign(
        await MainContract.read.name(),
        addrPub01.account!.address,
        await MainContract.read.currentPhaseName(),
        newRootSignerPrivateKey
      );

      expect(await MainContract.read.isValidSignature([messageHash, signature]))
        .to.be.true;
    });

    it("should receive ether from another address", async function () {
      const originBalanceOfContract = await PublicClient.getBalance({
        address: MainContract.address,
      });

      /* @ts-ignore */
      const hash = await addrTeam01.sendTransaction({
        to: MainContract.address as Address,
        value: parseEther("1"),
      });
      await PublicClient.waitForTransactionReceipt({ hash });

      const newBalanceOfContract = await PublicClient.getBalance({
        address: MainContract.address,
      });

      expect(newBalanceOfContract).to.equal(
        originBalanceOfContract + parseEther("1")
      );
    });

    it("should withdraw to specific address", async function () {
      const originBalanceOfContract = await PublicClient.getBalance({
        address: MainContract.address,
      });
      const originBeneficiaryBalanceOfContract = await PublicClient.getBalance({
        address: addrBeneficiary.account!.address,
      });

      await MainContract.write.withdraw([addrBeneficiary.account!.address]);

      expect(
        await PublicClient.getBalance({
          address: MainContract.address,
        })
      ).to.equal(parseEther("0"));
      expect(
        await PublicClient.getBalance({
          address: addrBeneficiary.account!.address,
        })
      ).to.equal(originBeneficiaryBalanceOfContract + originBalanceOfContract);
    });
  });
});

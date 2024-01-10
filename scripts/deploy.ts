import hre from "hardhat";

const MAX_BATCH_SIZE = 5;
const COLLECTION_SIZE = 5000;
const AMOUNT_FOR_DEV = 15;

async function main() {
  const mainContract = await hre.viem.deployContract("NFT", [
    MAX_BATCH_SIZE,
    COLLECTION_SIZE,
    AMOUNT_FOR_DEV,
  ]);

  console.log(`Deployed to ${mainContract.address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

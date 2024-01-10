import "dotenv/config";

import EthCrypto from "eth-crypto";
import Web3 from "web3";

const CONTRACT_NAME = "Tutancatmoon";
const INFURA_KEY = process.env.INFURA_KEY || "";
const ROOT_SIGNER_PRIVATE_KEY = process.env.ROOT_SIGNER_PRIVATE_KEY || "";

const provider = new Web3.providers.HttpProvider(
  `https://goerli.infura.io/v3/${INFURA_KEY}`
);
const web3 = new Web3(provider);

interface IBackendSignResult {
  messageHash: string;
  signature: string;
}

const backendSign = (
  contractName: string,
  address: string,
  phase: string,
  signerPrivateKey?: string
): Promise<IBackendSignResult> =>
  new Promise((resolve) => {
    const messageHash = web3.utils.soliditySha3(
      { type: "string", value: contractName },
      { type: "address", value: address },
      { type: "string", value: phase }
    ) as string;
    const signature = EthCrypto.sign(
      signerPrivateKey || ROOT_SIGNER_PRIVATE_KEY,
      messageHash
    );
    console.log("signature, ", signature);

    resolve({
      messageHash,
      signature,
    });
  });

const main = async () => {
  const result = await backendSign(
    CONTRACT_NAME,
    "0xa5135d8831D8e3AB3d891c488EC7d7480247dd29",
    "Team Mint"
  );

  console.table(result);
};
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

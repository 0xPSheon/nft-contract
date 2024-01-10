import EthCrypto from "eth-crypto";
import Web3 from "web3";

const provider = new Web3.providers.HttpProvider(
  `https://goerli.infura.io/v3/${process.env.INFURA_KEY}`
);
const web3 = new Web3(provider);

const ROOT_SIGNER_PRIVATE_KEY = process.env.ROOT_SIGNER_PRIVATE_KEY as string;

interface IBackendSignResponse {
  messageHash: string;
  signature: `0x${string}`;
}

export const backendSign = (
  contractName: string,
  ownerAddress: string,
  phaseName: string,
  signerPrivateKey?: string
): Promise<IBackendSignResponse> =>
  new Promise((resolve) => {
    const messageHash = web3.utils.soliditySha3(
      { type: "string", value: contractName },
      { type: "address", value: ownerAddress },
      { type: "string", value: phaseName }
    ) as string;
    const signature = EthCrypto.sign(
      signerPrivateKey || ROOT_SIGNER_PRIVATE_KEY,
      messageHash
    ) as `0x${string}`;

    resolve({
      messageHash,
      signature,
    });
  });

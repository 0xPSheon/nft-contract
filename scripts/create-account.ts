import Web3 from "web3";

const main = async () => {
  const web3 = new Web3(Web3.givenProvider);

  const account = web3.eth.accounts.create();
  console.table({
    address: account.address,
    privateKey: account.privateKey,
  });
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

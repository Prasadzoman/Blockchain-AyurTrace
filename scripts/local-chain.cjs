const ganache = require("ganache");
const { deploy } = require("./deploy-local.cjs");

const PORT = 8545;
const CHAIN_ID = 31337;

console.log("====================================================");
console.log("       AgastyaTrace Local Blockchain Node           ");
console.log("====================================================");

const server = ganache.server({
  wallet: {
    mnemonic: "test test test test test test test test test test test junk",
    totalAccounts: 10,
    defaultBalance: 10000, // 10,000 ETH
  },
  chain: {
    chainId: CHAIN_ID,
    networkId: CHAIN_ID,
  },
  logging: {
    quiet: true,
  },
});

server.listen(PORT, async (err) => {
  if (err) {
    console.error("Failed to start local blockchain:", err);
    process.exit(1);
  }

  console.log(`\n✓ Local Ethereum RPC Server running on http://127.0.0.1:${PORT}`);
  console.log(`✓ Network / Chain ID: ${CHAIN_ID}`);
  console.log("\n--- Default Test Accounts (Funded with 10,000 ETH each) ---");
  console.log("Account (0): 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");
  console.log("Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
  console.log("\nAccount (1): 0x70997970C51812dc3A010C7d01b50e0d17dc79C8");
  console.log("Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
  console.log("----------------------------------------------------------\n");

  // Automatically deploy contract once server is listening
  try {
    await deploy();
  } catch (deployErr) {
    console.error("Auto-deploy error:", deployErr);
  }
});

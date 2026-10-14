const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("--------------------------------------------------");
  console.log("Deploying AgastyaTrace smart contract...");

  const network = await hre.ethers.provider.getNetwork();
  console.log(`Target Network: ${network.name} (Chain ID: ${network.chainId})`);

  const [deployer] = await hre.ethers.getSigners();
  if (deployer) {
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log(`Deployer Address: ${deployer.address}`);
    console.log(`Deployer Balance: ${hre.ethers.formatEther(balance)} ETH`);
  }

  const AgastyaTrace = await hre.ethers.getContractFactory("AgastyaTrace");
  const agastyaTrace = await AgastyaTrace.deploy();
  await agastyaTrace.waitForDeployment();

  const contractAddress = await agastyaTrace.getAddress();
  console.log("--------------------------------------------------");
  console.log(`✓ AgastyaTrace deployed successfully to: ${contractAddress}`);
  console.log("--------------------------------------------------");

  // Export contract address & ABI to client/src/contracts/AgastyaTrace.json
  const artifactPath = path.join(__dirname, "../artifacts/contracts/AgastyaTrace.sol/AgastyaTrace.json");
  let artifact = {};
  if (fs.existsSync(artifactPath)) {
    artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  }

  const clientContractsDir = path.join(__dirname, "../client/src/contracts");
  if (!fs.existsSync(clientContractsDir)) {
    fs.mkdirSync(clientContractsDir, { recursive: true });
  }

  const clientExport = {
    address: contractAddress,
    network: {
      name: network.name,
      chainId: Number(network.chainId),
    },
    abi: artifact.abi || [],
  };

  const clientContractFile = path.join(clientContractsDir, "AgastyaTrace.json");
  fs.writeFileSync(clientContractFile, JSON.stringify(clientExport, null, 2), "utf8");
  console.log(`✓ Exported ABI and address to: ${clientContractFile}`);

  // Create or update client/.env
  const clientEnvPath = path.join(__dirname, "../client/.env");
  const envContent = `VITE_CONTRACT_ADDRESS=${contractAddress}\nVITE_SEPOLIA_RPC_URL=${process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org"}\nVITE_API_BASE_URL=http://localhost:5000\n`;
  fs.writeFileSync(clientEnvPath, envContent, "utf8");
  console.log(`✓ Updated client/.env with contract address`);

  return contractAddress;
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});

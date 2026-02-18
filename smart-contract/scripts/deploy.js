const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying Voting contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the contract
  const Voting = await ethers.getContractFactory("Voting");
  const voting = await Voting.deploy();

  await voting.waitForDeployment();

  const contractAddress = await voting.getAddress();
  console.log("✅ Voting contract deployed to:", contractAddress);

  // ─── Optional: Create a sample election after deploy ───────────────────────
  const now = Math.floor(Date.now() / 1000);
  const oneWeekLater = now + 7 * 24 * 60 * 60;

  const tx1 = await voting.createElection(
    "General Election 2026",
    "Annual blockchain general election for board members",
    now,
    oneWeekLater
  );
  await tx1.wait();
  console.log("📋 Sample election created");

  // Add sample candidates
  const tx2 = await voting.addCandidate(1, "Alice Johnson", "Progressive Party", "QmHash1");
  await tx2.wait();
  const tx3 = await voting.addCandidate(1, "Bob Smith", "Democratic Alliance", "QmHash2");
  await tx3.wait();
  const tx4 = await voting.addCandidate(1, "Carol White", "Independent", "QmHash3");
  await tx4.wait();
  console.log("👤 Sample candidates added");

  // ─── Save deployment info ───────────────────────────────────────────────────
  const fs = require("fs");
  const deploymentInfo = {
    contractAddress,
    deployer: deployer.address,
    network: (await ethers.provider.getNetwork()).name,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("💾 Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

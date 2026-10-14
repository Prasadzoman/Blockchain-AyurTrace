const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgastyaTrace Smart Contract", function () {
  let agastyaTrace;
  let owner;
  let transporter;
  let processor;
  let labTech;

  beforeEach(async function () {
    [owner, transporter, processor, labTech] = await ethers.getSigners();
    const AgastyaTrace = await ethers.getContractFactory("AgastyaTrace");
    agastyaTrace = await AgastyaTrace.deploy();
    await agastyaTrace.waitForDeployment();
  });

  it("should deploy with zero initial events for a new chainId", async function () {
    const chainId = "chain_test_001";
    const count = await agastyaTrace.getEventCount(chainId);
    expect(count).to.equal(0);
    const latestHash = await agastyaTrace.latestEventHash(chainId);
    expect(latestHash).to.equal(ethers.ZeroHash);
  });

  it("should record COLLECTED event as initial link with zero previousHash", async function () {
    const chainId = "66f8a2b3c1234567890abcd1";
    const eventType = "COLLECTED";
    const dataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify({
      species: "Ashwagandha",
      quantity: 50,
      farmingType: "Organic",
      plantPart: "Root"
    })));

    const tx = await agastyaTrace.connect(owner).addEvent(chainId, eventType, dataHash);
    const receipt = await tx.wait();

    const count = await agastyaTrace.getEventCount(chainId);
    expect(count).to.equal(1);

    const events = await agastyaTrace.getEvents(chainId);
    expect(events.length).to.equal(1);
    expect(events[0].eventType).to.equal(eventType);
    expect(events[0].dataHash).to.equal(dataHash);
    expect(events[0].previousHash).to.equal(ethers.ZeroHash);
    expect(events[0].actor).to.equal(owner.address);

    const latestHash = await agastyaTrace.latestEventHash(chainId);
    expect(latestHash).to.not.equal(ethers.ZeroHash);
  });

  it("should link consecutive events in a cryptographic hash-chain", async function () {
    const chainId = "66f8a2b3c1234567890abcd2";

    // 1. COLLECTED
    const hash1 = ethers.keccak256(ethers.toUtf8Bytes("collector_data"));
    await agastyaTrace.connect(owner).addEvent(chainId, "COLLECTED", hash1);
    const hashAfterCollect = await agastyaTrace.latestEventHash(chainId);

    // 2. TRANSPORTED
    const hash2 = ethers.keccak256(ethers.toUtf8Bytes("transport_data"));
    await agastyaTrace.connect(transporter).addEvent(chainId, "TRANSPORTED", hash2);
    const hashAfterTransport = await agastyaTrace.latestEventHash(chainId);

    // 3. PROCESSED
    const hash3 = ethers.keccak256(ethers.toUtf8Bytes("processing_data"));
    await agastyaTrace.connect(processor).addEvent(chainId, "PROCESSED", hash3);
    const hashAfterProcessing = await agastyaTrace.latestEventHash(chainId);

    // 4. LAB_TESTED
    const hash4 = ethers.keccak256(ethers.toUtf8Bytes("lab_data"));
    await agastyaTrace.connect(labTech).addEvent(chainId, "LAB_TESTED", hash4);
    const hashAfterLab = await agastyaTrace.latestEventHash(chainId);

    // Verify chain length
    const events = await agastyaTrace.getEvents(chainId);
    expect(events.length).to.equal(4);

    // Verify previousHash linking
    expect(events[0].previousHash).to.equal(ethers.ZeroHash);
    expect(events[1].previousHash).to.equal(hashAfterCollect);
    expect(events[2].previousHash).to.equal(hashAfterTransport);
    expect(events[3].previousHash).to.equal(hashAfterProcessing);

    // Verify actors
    expect(events[0].actor).to.equal(owner.address);
    expect(events[1].actor).to.equal(transporter.address);
    expect(events[2].actor).to.equal(processor.address);
    expect(events[3].actor).to.equal(labTech.address);
  });

  it("should reject invalid event submissions", async function () {
    const validHash = ethers.keccak256(ethers.toUtf8Bytes("data"));
    
    // Empty chainId
    await expect(
      agastyaTrace.addEvent("", "COLLECTED", validHash)
    ).to.be.revertedWith("AgastyaTrace: chainId cannot be empty");

    // Empty eventType
    await expect(
      agastyaTrace.addEvent("chain123", "", validHash)
    ).to.be.revertedWith("AgastyaTrace: eventType cannot be empty");

    // Zero dataHash
    await expect(
      agastyaTrace.addEvent("chain123", "COLLECTED", ethers.ZeroHash)
    ).to.be.revertedWith("AgastyaTrace: dataHash cannot be zero");
  });
});

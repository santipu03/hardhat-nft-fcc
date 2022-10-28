const { assert } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNFT Unit Tests", function () {
          let basicNft, deployer

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["basicnft"])
              basicNft = await ethers.getContract("BasicNft", deployer)
          })

          describe("constructor", function () {
              it("initializes NFT correctly", async function () {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()
                  assert.equal(name, "RacksDog")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })

          describe("mint NFT", function () {
              beforeEach(async () => {
                  const txResponse = await basicNft.mintNft()
                  await txResponse.wait(1)
              })
              it("allows users to mint an NFT, and updates appropiately", async () => {
                  const tokenURI = await basicNft.tokenURI(0)
                  const tokenCounter = await basicNft.getTokenCounter()

                  assert.equal(tokenURI, await basicNft.TOKEN_URI())
                  assert.equal(tokenCounter.toString(), "1")
              })
              it("shows the correct balance and owner of the NFT", async () => {
                  const deployerBalance = await basicNft.balanceOf(deployer)
                  const owner = await basicNft.ownerOf(0)
                  assert.equal(deployerBalance.toString(), "1")
                  assert.equal(owner, deployer)
              })
          })
      })

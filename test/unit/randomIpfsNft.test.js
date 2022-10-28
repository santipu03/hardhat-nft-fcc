const { assert } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIPFSNFT Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock
          const chainId = network.config.chainId

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
          })

          describe("constructor", () => {
              it("initializes NFT correctly", async () => {
                  const name = await randomIpfsNft.name()
                  const symbol = await randomIpfsNft.symbol()
                  const mintFee = await randomIpfsNft.getMintFee()
                  assert.equal(name.toString(), "Random IPFS NFT")
                  assert.equal(symbol.toString(), "RIN")
                  assert.equal(mintFee.toString(), networkConfig[chainId]["mintFee"])
              })
          })
      })

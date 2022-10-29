const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIPFSNFT Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock, mintFee
          const chainId = network.config.chainId

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              await deployments.fixture(["mocks", "randomipfs"])
              randomIpfsNft = await ethers.getContract("RandomIpfsNft", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              mintFee = await randomIpfsNft.getMintFee()
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

          describe("request NFT", () => {
              it("fails if payment isn't sent with the request", async () => {
                  await expect(randomIpfsNft.requestNft()).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("reverts if payment amount is less than the mint fee", async () => {
                  const fee = ethers.utils.parseEther("0.005")
                  await expect(randomIpfsNft.requestNft({ value: fee })).to.be.revertedWith(
                      "RandomIpfsNft__NeedMoreETHSent"
                  )
              })
              it("emits an event and kicks off a random word request", async function () {
                  const fee = await randomIpfsNft.getMintFee()
                  await expect(randomIpfsNft.requestNft({ value: fee.toString() })).to.emit(
                      randomIpfsNft,
                      "NftRequested"
                  )
              })
          })
      })

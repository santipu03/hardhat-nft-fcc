const { assert, expect } = require("chai")
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("RandomIPFSNFT Unit Tests", function () {
          let randomIpfsNft, deployer, vrfCoordinatorV2Mock, mintFee
          const chainId = network.config.chainId

          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
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

          describe("fulfillRandomWords", () => {
              it("mints NFT after random number is returned", async () => {
                  // Here we have to wait the VRF Coordinator to call fulfillRandomWords and then test the function
                  // So we'll wait for the NftMinted event to test
                  await new Promise(async (resolve, reject) => {
                      randomIpfsNft.once("NftMinted", async () => {
                          try {
                              const tokenCounter = await randomIpfsNft.getTokenCounter()
                              const tokenUri = await randomIpfsNft.tokenURI("0")
                              assert.equal(tokenCounter.toString(), "1")
                              assert(tokenUri.toString().includes("ipfs://"))

                              resolve()
                          } catch (e) {
                              console.log(e)
                              reject(e)
                          }
                      })
                      try {
                          const tx = await randomIpfsNft.requestNft({ value: mintFee })
                          const txReceipt = await tx.wait(1)
                          const requestId = txReceipt.events[1].args.requestId
                          await vrfCoordinatorV2Mock.fulfillRandomWords(
                              requestId,
                              randomIpfsNft.address
                          )
                      } catch (e) {
                          console.log(e)
                          reject(e)
                      }
                  })
              })
          })

          describe("withdraw", () => {
              it("should transfer the correct amount to the owner", async () => {
                  const deployerStartingBalance = await deployer.getBalance()
                  const player = (await getNamedAccounts()).player
                  const connectedContract = await ethers.getContract("RandomIpfsNft", player)
                  // get another player to request an NFT and pay the mintFee
                  const tx = await connectedContract.requestNft({ value: mintFee })
                  await tx.wait(1)
                  // the deployer then withdraw the funds
                  const tx2 = await randomIpfsNft.withdraw()
                  const txReceipt = await tx2.wait(1)
                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const deployerEndingBalance = await deployer.getBalance()
                  // We have to substract the gasUsed * gasPrice from that tx to compare
                  assert.equal(
                      deployerEndingBalance.toString(),
                      deployerStartingBalance
                          .sub(gasUsed.mul(effectiveGasPrice))
                          .add(mintFee)
                          .toString()
                  )
              })
          })

          describe("getBreedFromModdedRng", () => {
              it("should revert if moddedRng is > 99", async () => {
                  await expect(randomIpfsNft.getBreedFromModdedRng("100")).to.be.revertedWith(
                      "RandomIpfsNft__RangeOutOfBounds"
                  )
              })
              it("should return PUG if moddedRng is between 0 - 9", async () => {
                  // We test with 3 values to assure everything is in order
                  const breed = await randomIpfsNft.getBreedFromModdedRng("0")
                  const breed1 = await randomIpfsNft.getBreedFromModdedRng("5")
                  const breed2 = await randomIpfsNft.getBreedFromModdedRng("9")

                  // Should return 0, because the enum Breed(0) == PUG
                  assert.equal(breed, 0)
                  assert.equal(breed1, 0)
                  assert.equal(breed2, 0)
              })
              it("should return SHIBA_INU if moddedRng is between 10 - 39", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng("10")
                  const breed1 = await randomIpfsNft.getBreedFromModdedRng("25")
                  const breed2 = await randomIpfsNft.getBreedFromModdedRng("39")

                  // enum Breed(1) == SHIBA_INU
                  assert.equal(breed, 1)
                  assert.equal(breed1, 1)
                  assert.equal(breed2, 1)
              })
              it("should return ST_BERNARD if moddedRng is between 40 - 99", async () => {
                  const breed = await randomIpfsNft.getBreedFromModdedRng("40")
                  const breed1 = await randomIpfsNft.getBreedFromModdedRng("85")
                  const breed2 = await randomIpfsNft.getBreedFromModdedRng("99")

                  // enum Breed(2) == ST_BERNARD
                  assert.equal(breed, 2)
                  assert.equal(breed1, 2)
                  assert.equal(breed2, 2)
              })
          })

          describe("getDogTokenUris", () => {
              it("should return the adequate tokenUri", async () => {
                  const fee = await randomIpfsNft.getMintFee()
                  await randomIpfsNft.requestNft({ value: fee.toString() })
                  const tokenUri = await randomIpfsNft.getDogTokenUris(0)
                  assert(tokenUri.toString().includes("ipfs://"))
              })
          })
      })

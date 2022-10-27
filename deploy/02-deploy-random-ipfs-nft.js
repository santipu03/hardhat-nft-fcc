const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("5")
const imagesLocation = "./images/randomNft"
const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    attributes: {
        trait_type: "",
        value: "",
    },
}

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts()
    const chainId = network.config.chainId

    let tokenUris
    // Get the IPFS hashes of our images
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenuris()
    }

    // 1. Do it with our IPFS node --> will be only in your node / centralised
    // 2. Pinata -- pay them to pin it
    // 3. NFT.storage -- use filecoin in the background to persist data (THE BEST)

    let subscriptionId, vrfCoordinatorV2Address

    if (developmentChains.includes(network.name)) {
        const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address

        const txResponse = await vrfCoordinatorV2Mock.createSubscription()
        const txReceipt = await txResponse.wait(1)
        subscriptionId = txReceipt.events[0].args.subId
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
        subscriptionId = networkConfig[chainId]["subscriptionId"]
    }

    log("-----------------------------")

    const gasLane = networkConfig[chainId]["gasLane"]
    const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
    let dogTokenUris
    const mintFee = networkConfig[chainId]["mintFee"]

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        gasLane,
        callbackGasLimit,
        dogTokenUris,
        mintFee,
    ]
}

// Upload out code to Pinata

async function handleTokenuris() {
    tokenUris = []

    // store the Image in IPFS
    // store the metadata in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation)
    for (imageUploadResponsesIndex in imageUploadResponses) {
        // create the metadata and upload it
        let tokenUriMetadata = { ...metadataTemplate }
        tokenUriMetadata.name = files[imageUploadResponsesIndex].replace(".png", "")
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name} pup!`
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponsesIndex].IpfsHash}`
        console.log(`Uploading ${tokenUriMetadata.name}...`)
        // store the JSON to pinata IPFS
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata)
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`)
    }
    console.log("Token URIs uploaded! They are:")
    console.log(tokenUris)

    return tokenUris
}

module.exports.tags = ["all", "randomipfs", "main"]

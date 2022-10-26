const { run } = require("hardhat")

const verify = async (contractAddress, args) => {
    console.log("Verifying Contract")
    try {
        await run("verfify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already Verified!")
        } else {
            console.log(e)
        }
    }
}

import bsv from '@smartledger/bsv';

// Library calls are silent: private keys must never reach server logs.
// Only the CLI entry point below prints them.
function generateKeys({ log = false } = {}) {
    const privateKey = bsv.PrivateKey.fromRandom();
    const publicKey = privateKey.toPublicKey();
    const address = bsv.Address.fromPublicKey(publicKey);

    const keys = {
        privateKey: privateKey.toWIF(),
        publicKey: publicKey.toString(),
        address: address.toString()
    };
    if (log) {
        console.log("Private Key (WIF):", keys.privateKey);
        console.log("Public Key:", keys.publicKey);
        console.log("Address:", keys.address);
    }
    return keys;
}

// Export the function for use in other modules
export { generateKeys };
export default generateKeys;

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateKeys({ log: true });
}
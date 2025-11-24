import bsv from 'smartledger-bsv';

function generateKeys() {
    const privateKey = bsv.PrivateKey.fromRandom();
    const publicKey = privateKey.toPublicKey();
    const address = bsv.Address.fromPublicKey(publicKey);

    console.log("Private Key (WIF):", privateKey.toWIF());
    console.log("Public Key:", publicKey.toString());
    console.log("Address:", address.toString());
    const keys = {
        privateKey: privateKey.toWIF(),
        publicKey: publicKey.toString(),
        address: address.toString()
    };
    return keys;
}

// Export the function for use in other modules
export { generateKeys };
export default generateKeys;

// Run when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    generateKeys();
}
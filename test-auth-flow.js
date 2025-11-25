/**
 * Test Authentication Flow
 *
 * Demonstrates the challenge-response authentication flow:
 * 1. Request a challenge from the server
 * 2. Sign the challenge with your private key
 * 3. Submit the signed challenge to receive a JWT token
 * 4. Use the JWT token for authenticated requests
 */

import bsv from "smartledger-bsv";
import { signData } from "./tools/der-signature.js";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:3000";

async function testAuthFlow() {
	console.log("🔐 Testing Authentication Flow\n");

	// Step 1: Generate or use existing key pair
	console.log("Step 1: Generate key pair");
	const privateKey = process.env.TEST_PRIVATE_KEY
		? bsv.PrivateKey.fromWIF(process.env.TEST_PRIVATE_KEY)
		: bsv.PrivateKey.fromRandom();

	const privateKeyWIF = privateKey.toWIF();
	const publicKey = privateKey.toPublicKey().toString();
	const address = bsv.Address.fromPublicKey(
		privateKey.toPublicKey()
	).toString();

	console.log("  Private Key (WIF):", privateKeyWIF);
	console.log("  Public Key:", publicKey);
	console.log("  Address:", address);
	console.log();

	// Step 2: Request challenge from server
	console.log("Step 2: Request authentication challenge");
	const challengeResponse = await fetch(`${SERVER_URL}/api/auth/challenge`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ publicKey }),
	});

	const challengeData = await challengeResponse.json();
	console.log("  Challenge received:", challengeData);

	if (!challengeData.success) {
		console.error("❌ Failed to get challenge:", challengeData.error);
		return;
	}

	const { challenge } = challengeData;
	console.log("  Challenge nonce:", challenge);
	console.log("  Expires in:", challengeData.expiresIn, "seconds");
	console.log();

	// Step 3: Sign the challenge
	console.log("Step 3: Sign the challenge");
	const signature = signData(challenge, privateKeyWIF);
	console.log("  Signature (DER hex):", signature);
	console.log();

	// Step 4: Verify challenge and get JWT token
	console.log("Step 4: Submit signed challenge for verification");
	const verifyResponse = await fetch(`${SERVER_URL}/api/auth/verify`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			challenge,
			signature,
			publicKey,
		}),
	});

	const verifyData = await verifyResponse.json();
	console.log("  Verification result:", verifyData);
	console.log();

	if (!verifyData.success) {
		console.error("❌ Verification failed:", verifyData.error);
		return;
	}

	const { token } = verifyData;
	console.log("✅ Authentication successful!");
	console.log("  JWT Token:", token);
	console.log("  Expires in:", verifyData.expiresIn);
	console.log("  Issued at:", verifyData.issuedAt);
	console.log();

	// Step 5: Test using the token (example with a protected endpoint)
	console.log("Step 5: Use JWT token for authenticated request");
	console.log("  Token can be used in Authorization header:");
	console.log(`  Authorization: Bearer ${token}`);
	console.log();

	// Example of making an authenticated request
	console.log("  Example authenticated API call:");
	const testRequest = await fetch(`${SERVER_URL}/api/agents`, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
	});

	const testData = await testRequest.json();
	console.log(
		"  Response received:",
		testData.agents ? `${testData.agents.length} agents available` : testData
	);
	console.log();

	// Save credentials for future use
	console.log("💾 Save these credentials for future use:");
	console.log('  export TEST_PRIVATE_KEY="' + privateKeyWIF + '"');
	console.log('  export TEST_PUBLIC_KEY="' + publicKey + '"');
	console.log();

	return {
		privateKey: privateKeyWIF,
		publicKey,
		address,
		token,
	};
}

// Run the test
testAuthFlow()
	.then((result) => {
		if (result) {
			console.log("✅ Authentication flow completed successfully!");
		}
	})
	.catch((error) => {
		console.error("❌ Error during authentication flow:", error);
	});

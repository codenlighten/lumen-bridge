import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const READY_LOG = "Future Self Bridge Architecture";

// Stable per-process admin key so tests can hit admin endpoints
// without depending on whatever's in .env locally.
export const TEST_ADMIN_KEY = "test-admin-key-do-not-use-in-prod";

export async function startTestServer({ port = 3099, env = {} } = {}) {
	const child = spawn(
		process.execPath,
		["server.js"],
		{
			env: {
				...process.env,
				PORT: String(port),
				NODE_ENV: env.NODE_ENV || "development",
				ADMIN_KEY: env.ADMIN_KEY || TEST_ADMIN_KEY,
				...env,
			},
			stdio: ["ignore", "pipe", "pipe"],
		}
	);

	let buf = "";
	let ready = false;
	child.stdout.on("data", (d) => {
		buf += d.toString();
		if (buf.includes(READY_LOG)) ready = true;
	});
	child.stderr.on("data", (d) => {
		buf += d.toString();
	});

	const deadline = Date.now() + 20_000;
	while (!ready && Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(
				`server exited before ready (code=${child.exitCode})\n${buf}`
			);
		}
		await sleep(150);
	}
	if (!ready) {
		child.kill("SIGKILL");
		throw new Error(`server did not become ready in time\n${buf.slice(-2000)}`);
	}

	// Small grace period for late `app.use` registrations after listen
	await sleep(300);

	const url = `http://127.0.0.1:${port}`;
	return {
		url,
		child,
		logs: () => buf,
		async stop() {
			if (child.exitCode !== null) return;
			child.kill("SIGTERM");
			const t = Date.now() + 5000;
			while (child.exitCode === null && Date.now() < t) await sleep(100);
			if (child.exitCode === null) child.kill("SIGKILL");
		},
	};
}

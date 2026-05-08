const express = require("express");
const cors = require("cors");
const { exec, spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 7000;

function runCommand(command, cwd) {
	return new Promise((resolve, reject) => {
		exec(
			command,
			{ cwd, timeout: 20000, maxBuffer: 1024 * 1024 * 5 },
			(error, stdout, stderr) => {
				if (error) {
					reject({
						error,
						stdout: stdout || "",
						stderr: stderr || error.message || "",
					});
					return;
				}
				resolve({ stdout: stdout || "", stderr: stderr || "" });
			},
		);
	});
}

function runBinary(binaryPath, stdinInput, cwd) {
	return new Promise((resolve, reject) => {
		const child = spawn(binaryPath, { cwd, stdio: ["pipe", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		let timedOut = false;

		const timeout = setTimeout(() => {
			timedOut = true;
			child.kill("SIGKILL");
		}, 15000);

		child.stdout.on("data", (chunk) => {
			stdout += chunk.toString();
		});

		child.stderr.on("data", (chunk) => {
			stderr += chunk.toString();
		});

		child.on("error", (error) => {
			clearTimeout(timeout);
			reject({ error, stdout, stderr: stderr || error.message });
		});

		child.on("close", (code) => {
			clearTimeout(timeout);
			if (timedOut) {
				reject({
					error: { code: 124 },
					stdout,
					stderr: stderr || "Execution timed out after 15000ms",
				});
				return;
			}

			if (code !== 0) {
				reject({
					error: { code },
					stdout,
					stderr: stderr || `Process exited with code ${code}`,
				});
				return;
			}

			resolve({ stdout, stderr });
		});

		child.stdin.on("error", () => {
			// Process may close stdin early; ignore to avoid unhandled stream errors.
		});
		child.stdin.write(stdinInput, "utf8");
		child.stdin.end();
	});
}

app.get("/health", (_, res) => {
	res.json({ ok: true, service: "lexyacc-runner" });
});

app.post("/execute", async (req, res) => {
	const { lexCode, yaccCode, stdin } = req.body || {};

	if (!lexCode || !yaccCode) {
		return res.status(400).json({
			error: "Both lexCode and yaccCode are required.",
		});
	}

	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "lexyacc-"));
	const lexPath = path.join(tmpDir, "lexer.l");
	const yaccPath = path.join(tmpDir, "parser.y");
	const outputPath = path.join(tmpDir, "parser");

	try {
		fs.writeFileSync(lexPath, lexCode, "utf8");
		fs.writeFileSync(yaccPath, yaccCode, "utf8");

		await runCommand("bison -d parser.y", tmpDir);
		await runCommand("flex lexer.l", tmpDir);
		await runCommand(
			`gcc lex.yy.c parser.tab.c -Wall -Wextra -o "${outputPath}" -lfl`,
			tmpDir,
		);

		const rawInput = typeof stdin === "string" ? stdin : "";
		// Many Yacc grammars consume newline as an explicit token.
		const normalizedInput = rawInput.endsWith("\n") ? rawInput : `${rawInput}\n`;
		const runResult = await runBinary(outputPath, normalizedInput, tmpDir);

		return res.json({
			stdout: runResult.stdout,
			stderr: runResult.stderr,
			exitCode: 0,
		});
	} catch (err) {
		return res.status(500).json({
			error: "Failed to execute Lex/Yacc code",
			stdout: err.stdout || "",
			stderr: err.stderr || "",
			exitCode: err.error?.code ?? 1,
		});
	} finally {
		try {
			fs.rmSync(tmpDir, { recursive: true, force: true });
		} catch (cleanupErr) {
			// Intentionally ignore cleanup errors for best-effort temp cleanup.
		}
	}
});

app.listen(PORT, () => {
	console.log(`Lex/Yacc runner listening on port ${PORT}`);
});

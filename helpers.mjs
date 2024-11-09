import path from "path";
import config from "./config.json" with { type: "json" };
import fs from "fs/promises";

export function processEnvironment(config) {
	return {
		FOLDERS: config.watch.map((folder) => path.resolve(folder)),
		PLUGIN_DIRECTORY: path.resolve("./plugins"),
		LOG_DIRECTORY: config.logDir ? path.resolve(config.logDir) : path.resolve("./logs"),
		COMPLETED_DIR_NAME: config.completeDir || "completed",
		FAILED_DIR_NAME: config.failedDir || "failed",
	};
}

export function fileInfo(filePath) {
	const basename = path.basename(filePath);
	const extension = path.extname(filePath).replace(".", "");
	const name = path.basename(filePath, extension).replace(/\.(?=[^.]*$)/, "");
	const dir = path.dirname(filePath);
	const fullPath = path.resolve(filePath);

	return {
		basename,
		extension,
		name,
		path: filePath,
		dir,
		fullPath,
	};
}

export async function readFile(filePath) {
	return fs.readFile(filePath, "utf-8");
}

export async function log(pluginName, text) {
	/**
	 * Plugin name is required
	 */
	if (!pluginName) throw Error("Plugin name is required for logging.");

	/**
	 * Get current timestamp
	 */
	const now = new Date();

	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0"); // Months are zero-based
	const day = String(now.getDate()).padStart(2, "0");

	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");

	const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

	/**
	 * Configure log file path
	 */
	let logDir = config.logDir.replace(/\/+$/, "") || "./logs";
	let filePath = `${logDir}/${pluginName}.log`;

	/**
	 * Console log for debugging
	 */
	console.log(`[${pluginName}] ${text}`);

	try {
		await fs.appendFile(filePath, `\n[${timestamp}] ${text}`);
	} catch (error) {
		throw Error(error);
	}
}

export async function markCompleted(pluginName, filePath, text = "") {
	/**
	 * Plugin name is required
	 */
	if (!filePath) throw Error("File path is required to mark complete.");

	const { COMPLETED_DIR_NAME } = processEnvironment(config);

	if (typeof text === "string" && text.trim().length) {
		text = `\n\n---\n${text.trim()}`;
		await log(pluginName, `Modifying ${filePath} before marking completed.`);
	}

	try {
		await fs.appendFile(filePath, text);
		const { name, extension, dir } = fileInfo(filePath);
		const timestamp = Math.floor(Date.now() / 1000);
		const newPath = path.resolve(`${dir}/${COMPLETED_DIR_NAME}/${name}_${timestamp}.${extension}`);

		await fs.rename(filePath, newPath);
		await log(pluginName, `Moved ${filePath} to ${newPath}.`);
	} catch (error) {
		throw Error(error);
	}
}

export async function markFailed(pluginName, filePath, text = "") {
	/**
	 * Plugin name is required
	 */
	if (!filePath) throw Error("File path is required to mark failed.");

	const { FAILED_DIR_NAME } = processEnvironment(config);

	if (typeof text === "string" && text.trim().length) {
		text = `\n\n---\n${text.trim()}`;
		await log(pluginName, `Modifying ${filePath} before marking failed.`);
	}

	try {
		await fs.appendFile(filePath, text);
		const { name, extension, dir } = fileInfo(filePath);
		const timestamp = Math.floor(Date.now() / 1000);
		const newPath = path.resolve(`${dir}/${FAILED_DIR_NAME}/${name}_${timestamp}.${extension}`);

		await fs.rename(filePath, newPath);
		await log(pluginName, `Moved ${filePath} to ${newPath}.`);
	} catch (error) {
		throw Error(error);
	}
}

export function extractDataFromContent(content) {
	let result = [{}]; // [config, body]
	const parts = content.split(/\r?\n\r?\n/);
	const meta = parts[0].split("\n");
	const data = parts[1];

	// Extract meta
	for (let line of meta) {
		let [name, ...valueParts] = line.split(":");
		result[0][name.trim().toLowerCase()] = valueParts.join(":").trim();
	}

	// Extract body
	result.push(data);

	return result;
}

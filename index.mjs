import chokidar from "chokidar";
import fs from "fs";
import fsP from "fs/promises";
import path from "path";
import { pathToFileURL } from "url";
import config from "./config.json" with { type: "json" };
import { processEnvironment, fileInfo } from "./helpers.mjs";

if (!config.plugins) {
	console.log(`"plugins" is required in the config.json file.`);
	process.exit();
}

if (!config.watch) {
	console.log(`"watch" folders need to be configured in the config.json file.`);
	process.exit();
}

const { FOLDERS, PLUGIN_DIRECTORY, LOG_DIRECTORY, COMPLETED_DIR_NAME, FAILED_DIR_NAME } = processEnvironment(config);

async function importPlugins(dir) {
	const folders = fs.readdirSync(PLUGIN_DIRECTORY, { withFileTypes: true });
	let plugins = {};

	for (const folder of folders) {
		if (folder.isDirectory()) {
            /**
             * Excluding disabled plugins
             */
            if (config.plugins[folder.name] && config.plugins[folder.name].disabled) continue;

			const subDir = path.join(dir, folder.name);
			const indexFilePath = path.join(subDir, "index.mjs");

			if (fs.existsSync(indexFilePath)) {
				const moduleUrl = pathToFileURL(indexFilePath);
				const module = await import(moduleUrl.href);
				plugins[folder.name.toLowerCase()] = module.default || module;
				console.log(`Imported plugin plugins ${folder.name}`);
			}
		}
	}

	return plugins;
}

try {
	// Import plugins
	let plugins = await importPlugins(PLUGIN_DIRECTORY);

	await fsP.mkdir(LOG_DIRECTORY, { recursive: true });
	for (let folder of FOLDERS) {
		folder = folder.replace(/\/+$/, "");
		await fsP.mkdir(folder, { recursive: true });
		await fsP.mkdir(`${folder}/${COMPLETED_DIR_NAME}`, { recursive: true });
		await fsP.mkdir(`${folder}/${FAILED_DIR_NAME}`, { recursive: true });
	}

	// Initialize watcher.
	const watcher = chokidar.watch(FOLDERS, {
		depth: 0,
		cwd: ".",
		persistent: true,
		ignoreInitial: false,
		awaitWriteFinish: true,
		followSymlinks: true,
		alwaysStat: false,
	});

	watcher.on("add", (filePath) => {
		let { extension, path, fullPath } = fileInfo(filePath);

		if (!plugins[extension]) {
			console.log(`Unknown plugin for file ${path}. Skipping...`);
			return;
		}

		// Apply plugin
		plugins[extension.toLowerCase()].call(null, fullPath);
	});

	console.log("Watching for folder changes...");
} catch (error) {
	console.log(error);
}

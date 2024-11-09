import axios from "axios";
import config from "../../config.json" with { type: "json" };
import { extractDataFromContent, markCompleted, markFailed, log, readFile } from "../../helpers.mjs";

const NAMESPACE = "ntfy";
export default async function (filePath) {
	// Log operation
	await log(NAMESPACE, `Processing new file ${filePath}`);

	// Extract plugin specific config
	const ntfyConfig = config.plugins.ntfy;

	// Get required config
	let { host: defaultHost, defaultTopic, defaultPriority, accessToken: defaultToken } = ntfyConfig;

	try {
		/**
		 * Read file for data
		 */
		const fileContent = await readFile(filePath);

		let [{ topic, title, priority, token, host }, body] = extractDataFromContent(fileContent);

        // Token & host override
        if (!host && !defaultHost) throw new Error("ntfy plugin requires `host` in `config.json` or in the watch file.");
        if (!token && !defaultToken) throw new Error("ntfy plugin requires `accessToken` in config.json or `token` in the watch file.");
        let accessToken = token ? token : defaultToken;
        host = host ? host.replace(/\/+$/, "") : defaultHost.replace(/\/+$/, ""); // Trim trailing slashes

		// Subject
		title = title ? title : "";

		// Topic
		if (!topic && !defaultTopic) throw new Error("Topic is missing.");
		if (!topic) topic = defaultTopic;

		// Priority
		if (!priority) priority = defaultPriority ? defaultPriority : 3;

		// Markdown?
		let markdown = !!ntfyConfig.markdown;
		let headers = {
			Authorization: `Bearer ${accessToken}`,
			Title: title,
			Priority: priority,
		};
		if (markdown) headers.Markdown = "yes";

		await axios
			.post(`${host}/${topic}`, body, {
				headers,
			})
			.then(async (response) => {
				// Mark completed and log result
				await markCompleted(
					NAMESPACE,
					filePath,
					"Notification sent to ntfy server. Server returns:\n" + JSON.stringify(response.data, null, 2)
				);
				await log(NAMESPACE, `${filePath} processed successfuly.`);
			})
			.catch(async (error) => {
				// Mark failed and log errors
				await markFailed(NAMESPACE, filePath, error.response);
				await log(NAMESPACE, `Unable to process ${filePath}. Error: ${error.response}`);
			});
	} catch (error) {
        await markFailed(NAMESPACE, filePath, `Unable to process. Server returns: ${error.toString()}`);
		await log(NAMESPACE, `Unable to process ${filePath}. Error: ${error}`);
	}
}

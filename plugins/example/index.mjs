import config from "../../config.json" with { type: "json" };
import { extractDataFromContent, markCompleted, markFailed, log, readFile } from "../../helpers.mjs";

const NAMESPACE = "example";
export default async function (filePath) {

    /**
     * You can access the configs for your plugin (provided by the user)
     * through the config variable
     */
    let myConfig = config.example;

	try {
        /**
         * Use log() to log any messages to the log folder
         */
        await log(NAMESPACE, `Processing ${filePath}.`);

		/**
		 * Read file for data
		 */
		const fileContent = await readFile(filePath);

		/**
         * Use extractDataFromContent() to get the following returns:
         *      [metadata, body]
         * 
         * Where:
         *      - metadata contains key-value pairs of configurations.
         *      - body contains the rest of the message
         * 
         * For example, if the file content is:
         * 
         *     +---------------------------------------+
         *     | User: afunworm                        |
         *     | Title: Developer                      |
         *     |                                       |
         *     | This is a note for the user           |
         *     +---------------------------------------+
         *
         * Then you will receive this back:
         *      [
         *          { user: "afunworm", title: "Developer" },
         *          "This is a note for the user"   
         *      ]
         */
		let [{ user, title }, note] = extractDataFromContent(fileContent);

        // Perform your design action
        console.log(`The tile of ${user} is ${title}. Note is: ${note}`);

        /**
         * Use markCompleted() when everything checks out. It takes in 3 arguments:
         *     - pluginName, just simply leave it as NAMESPACE for simplicity
         *     - filePath, just leave it as filePath
         *     - text (string): additional message to append to the original file before moving it to the completed folder
         */
        await markCompleted(
            NAMESPACE,
            filePath,
            "Action completed. Server returns: OK."
        );

        await log(NAMESPACE, `${filePath} processed successfuly.`);
	} catch (error) {
        /**
         * Use markFailed() (opposite of markCompleted())when an error is raised or when the request cannot be completed.
         * 
         * Just like markCompleted(), markFailed() takes in 3 arguments:
         *     - pluginName, just simply leave it as NAMESPACE for simplicity
         *     - filePath, just leave it as filePath
         *     - text (string): additional message to append to the original file before moving it to the failed folder
        */
        await markFailed(NAMESPACE, filePath, `Unable to process. Server returns: ${error.toString()}`);
		await log(NAMESPACE, `Unable to process ${filePath}. Error: ${error}`);
	}
}

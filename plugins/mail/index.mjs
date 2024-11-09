import nodemailer from "nodemailer";
import config from "../../config.json" with { type: "json" };
import { extractDataFromContent, markCompleted, markFailed, log, readFile } from "../../helpers.mjs";

const NAMESPACE = "mail";
export default async function (filePath) {
	// Log operation
	await log(NAMESPACE, `Processing new file ${filePath}`);

	// Extract plugin specific config
	const mailConfig = config.plugins.mail;

	// Create a transporter
	let transporter = nodemailer.createTransport({
		host: mailConfig.host,
		port: mailConfig.port,
		secure: mailConfig.secure,
		auth: {
			user: mailConfig.user,
			pass: mailConfig.password,
		},
	});

	try {
		/**
		 * Read file for data
		 */
		const fileContent = await readFile(filePath);

		// Extract data
		let [{ from, to, subject }, message] = extractDataFromContent(fileContent);

		// Create an envelope
		let envelope = {};

		// Add body
		if (mailConfig.html) {
			envelope.html = message;
		} else {
			envelope.text = message;
		}

		// Override FROM field if settings allow
		envelope.from = mailConfig.allowFromOverride && !!from ? from : mailConfig.from;

		// Other envelope info
		envelope = {
			...envelope,
			to,
			subject,
		};

		// Send mail
		await transporter
			.sendMail(envelope)
			.then(async (response) => {
				// Mark completed and log result
				await markCompleted(
					NAMESPACE,
					filePath,
					"Mail sent through Nodemailer. Server returns:\n" + JSON.stringify(response, null, 2)
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

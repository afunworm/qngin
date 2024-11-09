![qngin](icon.png)

# qngin | Queue Engine for Notifications & Beyond

## THE WHAT

qngin provides a quick, simple and easy way to send email (SMTP) & [ntfy](https://ntfy.sh) notifications from your server just by creating a file in the queue folder. This eliminates the need to remember complex syntaxes. You just need to set up your credentials in the `config.json` file, then move or create new files in the watch folder to perform what you need. It's also fairly easy to develop your own plugins to process your own files the way you want.

## EXAMPLES

Let's assume that we set up the watch folder to be `/srv/qngin/`.

To send an email, you can simply create a new file with `.mail` extension in that folder:

```text
To: afunworm@example.com
Subject: This Is A Test Email

<h1>This is an amazing email header!</h1>
<p>And amazing email body!</p>
```

And that's it, your email will be processed & sent. You can easily send an email from the command line by using:

```bash
echo "To: afunworm@example.com\nSubject: Test Email\n\nThis is a test email" > /srv/qngin/test.email
```

Below is a quick example of sending a ntfy notification:

```bash
echo "Topic: test\nTitle: Test NTFY\n\nThis is a test notification **with markdown**!" > /srv/qngin/test.ntfy
```

## GETTING STARTED

Create a docker compose file `docker-compose.yml`:

```yaml
services:
    qngin:
        container_name: qngin
        restart: unless-stopped
        volumes:
            # Map config.json so it can be edited outside of the container
            - ./config.json:/app/config.json

            # Map the watch dir to wherever you want on your server
            # In this example, we will be watching /srv/qngin/
            # We can also watch multiple folders by editing the config.json files
            # And if we do, we have to map all of those as well
            - /srv/qngin:/app/queues

            # Map the logs folder to view logs
            - ./logs:/app/logs
        image: afunworm/qngin:latest
```

Download the sample `config.json` from the repository and configure it to your liking. Below is an example:

```json
{
	"plugins": {
		"mail": {
			"host": "smtp.example.com",
			"port": 587,
			"secure": false,
			"user": "afunworm@example.com",
			"from": "no-reply@mail.example.com",
			"password": "password",
			"html": true,
			"allowFromOverride": true,
			"comment": "Leave secure to false if using port 587 or 25. If using 465 and needing TSL, set secure to true."
		},
		"ntfy": {
			"host": "https://ntfy.sh",
			"accessToken": "",
			"defaultTopic": "_dev",
			"defaultPriority": 3,
			"markdown": true
		}
	},
	"watch": ["./queues"],
	"completeDir": "completed",
	"failedDir": "failed",
	"logDir": "./logs"
}
```

Then run your container:

```bash
docker compose up -d
```

## CUSTOM PLUGINS

You can develop your own custom plugin by create a folder inside `plugins`. Any file created in the watch folder with the same extension as your plugin directory will be processed through your script. There are also a few helper functions made to facilitate the common tasks when developing the plugin. See the `plugins/example` folder for more details.

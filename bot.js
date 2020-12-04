const fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();

var config = {
	prefix: "!"
}

const token = fs.readFileSync("token.txt", "utf-8").trim();
client.login(token);

client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));

client.on('message', (msg) => {
	if (msg.content.startsWith(config.prefix)) {
		let args = msg.content.split(" ");
		let command = args.shift().substring(config.prefix.length);
		switch (command) {
			default:
				// Invalid command
				break;
		}
	}
});

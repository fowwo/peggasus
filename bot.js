const fs = require("fs");
const Discord = require("discord.js");
const Game = require("./Game");
const client = new Discord.Client();

var config = {
	prefix: "!"
}
var stat = {};
if (fs.existsSync("config.json")) config = JSON.parse(fs.readFileSync("config.json", "utf-8"));
if (fs.existsSync("stat.json")) stat = JSON.parse(fs.readFileSync("stat.json", "utf-8"));

const token = fs.readFileSync("token.txt", "utf-8").trim();
client.login(token);

client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));

client.on('message', (msg) => {
	if (msg.content.startsWith(config.prefix)) {
		let args = msg.content.split(" ");
		let command = args.shift().substring(config.prefix.length);
		let mentions = msg.mentions.users.array();
		let game;
		switch (command.toLowerCase()) {
			case "config":
				configCommand(args);
				break;
			case "rps":
				switch (args[0].toLowerCase()) {
					case "l":
					case "list":
					case "leaderboard":
					case "score":
					case "scores":
					case "stat":
					case "stats":
						Game.RockPaperScissors.sendLeaderboard(msg.channel, stat, msg.guild, mentions[0]);
						return;
				}
				game = new Game.RockPaperScissors(client, msg.channel, stat, msg.author, mentions[0]);
				game.onEnd(saveStats);
				game.challenge();
				msg.delete();
				break;
			case "tic-tac-toe":
			case "tictactoe":
			case "ttt":
				game = new Game.TicTacToe(client, msg.channel, stat, msg.author, mentions[0]);
				game.onEnd(saveStats);
				game.challenge();
				msg.delete();
				break;
			default:
				// Invalid command
				break;
		}
	}
});

/**
 * Saves the current configuration settings to a file.
 */
function saveConfig() {
	fs.writeFile("config.json", JSON.stringify(config, null, 4), (err) => { if (err) throw err; });
}

/**
 * Saves the current game stats to a file.
 */
function saveStats() {
	fs.writeFile("stat.json", JSON.stringify(stat, null, 4), (err) => { if (err) throw err; });
}

/**
 * The `config` command. Used to manage configuration settings.
 * @param {String[]} args 
 */
function configCommand(args) {
	switch (args[0]) {
		case "prefix":
			if (args[1] !== undefined) {
				config.prefix = args[1];
				console.log(`The command prefix has been changed to "${config.prefix}".`);
				saveConfig();
			}
			break;
	}
}

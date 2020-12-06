const fs = require("fs");
const Discord = require("discord.js");
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
		switch (command.toLowerCase()) {
			case "config":
				configCommand(args);
				break;
			case "rps":
				rockPaperScissorsCommand(msg, args);
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

// Commands

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

/**
 * The `rps` command. Used to start Rock Paper Scissors games.
 * @param {Discord.Message} msg 
 */
function rockPaperScissorsCommand(msg, args) {

	let mentions = msg.mentions.users.array();

	switch (args[0].toLowerCase()) {
		case "l":
		case "list":
		case "leaderboard":
		case "score":
		case "scores":
		case "stat":
		case "stats":
			checkUndefined(msg.guild);
			let arr = Object.entries(stat[msg.guild.id].rps).sort((a, b) => {
				let x = (a[1].win + 0.5 * a[1].draw) / (a[1].win + a[1].draw + a[1].loss);
				let y = (b[1].win + 0.5 * b[1].draw) / (b[1].win + b[1].draw + b[1].loss);
				if (x < y) return 1;
				else if (x > y) return -1;
				else if (a[1].win < b[1].win) return 1;
				else if (a[1].win > b[1].win) return -1;
				return 0;
			});

			if (arr.length !== 0) {
				let rank = 1;
				let idArr = arr.map(x => x[0]);
				msg.guild.members.fetch({ user: idArr }).then((users) => {
					let str = `:first_place: **${users.get(arr[0][0]).user.username}** (${((arr[0][1].win + 0.5 * arr[0][1].draw) / (arr[0][1].win + arr[0][1].draw + arr[0][1].loss)).toFixed(3)})\n-- **${arr[0][1].win}** win${arr[0][1].win === 1 ? "" : "s"} / **${arr[0][1].draw}** tie${arr[0][1].draw === 1 ? "" : "s"} / **${arr[0][1].loss}** loss${arr[0][1].loss === 1 ? "" : "es"}`;
					for (var i = 1; i < arr.length; i++) {
						let x = (arr[i][1].win + 0.5 * arr[i][1].draw) / (arr[i][1].win + arr[i][1].draw + arr[i][1].loss);
						let y = (arr[i - 1][1].win + 0.5 * arr[i - 1][1].draw) / (arr[i - 1][1].win + arr[i - 1][1].draw + arr[i - 1][1].loss);
						if (x != y) rank = i + 1;
						switch (rank) {
							case 1:
								str += `\n:first_place:`
								break;
							case 2:
								str += `\n:second_place:`
								break;
							case 3:
								str += `\n:third_place:`
								break;
							default:
								str += `\n**${rank}.**`
								break;

						}
						str += ` **${users.get(arr[i][0]).user.username}** (${((arr[i][1].win + 0.5 * arr[i][1].draw) / (arr[i][1].win + arr[i][1].draw + arr[i][1].loss)).toFixed(3)})\n-- **${arr[i][1].win}** win${arr[i][1].win === 1 ? "" : "s"} / **${arr[i][1].draw}** tie${arr[i][1].draw === 1 ? "" : "s"} / **${arr[i][1].loss}** loss${arr[i][1].loss === 1 ? "" : "es"}`;
					}
					msg.channel.send(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: str,
						footer: { text: `Listing the top ${arr.length} player${arr.length === 1 ? "" : "s"} sorted by WDL ratio.` },
						color: "#faa61a"
					}));
				});
			} else {
				msg.channel.send(new Discord.MessageEmbed({ 
					title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
					description: "No players to list.",
					color: "#faa61a"
				}));
			}
			msg.delete();
			return;
	}

	let challenger = msg.author;
	let opponent = mentions[0];
	if (opponent === undefined) return;
	
	if (challenger.id === opponent.id) {
		msg.channel.send(new Discord.MessageEmbed({ 
			title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
			description: `:no_entry_sign: You can't challenge yourself, ${challenger.toString()}!`,
			color: "#ff0000"
		})).then((message) => {
			setTimeout(() => { message.delete(); }, 5000);
		});
	} else if (challenger.bot || opponent.bot) {
		msg.channel.send(new Discord.MessageEmbed({ 
			title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
			description: `:no_entry_sign: You can't challenge a bot, ${challenger.toString()}.`,
			color: "#ff0000"
		})).then((message) => {
			setTimeout(() => { message.delete(); }, 5000);
		});
	} else {
		let embed = new Discord.MessageEmbed({ 
			title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
			description: `:crossed_swords: ${challenger.toString()} is challenging ${opponent.toString()} to a game of Rock Paper Scissors!`,
			footer: { text: "Do you want to accept the challenge?" },
			color: "#faa61a" 
		});
		msg.channel.send(embed).then((message) => {
			message.react("✅");
			message.react("❌");
			let collector = message.createReactionCollector((reaction, user) => 
				(user.id === challenger.id && reaction.emoji.name === "❌") ||
				(user.id === opponent.id && (reaction.emoji.name === "✅" || reaction.emoji.name === "❌"))
			).once("collect", (reaction, user) => {
				if (reaction.emoji.name === "✅") {

					// Challenge accepted
					message.reactions.removeAll();
					message.edit(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: `:crossed_swords: ${opponent.toString()} accepted ${challenger.toString()}'s challenge!`,
						footer: { text: "Waiting for players." },
						color: "#bbbbff"
					}));

					let game = { challenger: null, opponent: null };
					challenger.send(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: `What will you use against ${opponent.username}?`,
						footer: { text: "Choose an item." },
						color: "#faa61a"
					})).then((pmc) => {
						opponent.send(new Discord.MessageEmbed({ 
							title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
							description: `What will you use against ${challenger.username}?`,
							footer: { text: "Choose an item." },
							color: "#faa61a"
						})).then((pmo) => {

							pmc.react("🪨");
							pmc.react("📄");
							pmc.react("✂️");
							pmo.react("🪨");
							pmo.react("📄");
							pmo.react("✂️");

							let challengerCollector = pmc.createReactionCollector((reaction, user) => 
								user.id === challenger.id && (reaction.emoji.name === "🪨" || reaction.emoji.name === "📄" || reaction.emoji.name === "✂️")
							).once("collect", (reaction) => {
								let newEmbed = new Discord.MessageEmbed({ 
									title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
									footer: { text: "Waiting for opponent..." },
									color: "#bbbbff"
								});
								if (reaction.emoji.name === "🪨") {
									newEmbed.setDescription(":rock: You picked Rock.");
									game.challenger = 0;
								} else if (reaction.emoji.name === "📄") {
									newEmbed.setDescription(":page_facing_up: You picked Paper.");
									game.challenger = 1;
								} else {
									newEmbed.setDescription(":scissors: You picked Scissors.");
									game.challenger = 2;
								}
								if (game.opponent !== null) {
	
									// Game finished
									outputWinner(game, message, pmc, pmo);
	
								} else {
	
									// Waiting for opponent
									pmc.edit(newEmbed);
									message.edit(new Discord.MessageEmbed({ 
										title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
										description: `:crossed_swords: ${opponent.toString()} accepted ${challenger.toString()}'s challenge!`,
										footer: { text: `Waiting for ${opponent.username}...` },
										color: "#bbbbff"
									}));
	
								}
								challengerCollector.stop();
							});
							let opponentCollector = pmo.createReactionCollector((reaction, user) => 
								user.id === opponent.id && (reaction.emoji.name === "🪨" || reaction.emoji.name === "📄" || reaction.emoji.name === "✂️")
							).once("collect", (reaction) => {
								let newEmbed = new Discord.MessageEmbed({ 
									title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
									footer: { text: "Waiting for opponent..." },
									color: "#bbbbff"
								});
								if (reaction.emoji.name === "🪨") {
									newEmbed.setDescription(":rock: You picked Rock.");
									game.opponent = 0;
								} else if (reaction.emoji.name === "📄") {
									newEmbed.setDescription(":page_facing_up: You picked Paper.");
									game.opponent = 1;
								} else {
									newEmbed.setDescription(":scissors: You picked Scissors.");
									game.opponent = 2;
								}
								if (game.challenger !== null) {
									
									// Game finished
									outputWinner(game, message, pmc, pmo);
	
								} else {
	
									// Waiting for opponent
									pmo.edit(newEmbed);
									message.edit(new Discord.MessageEmbed({ 
										title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
										description: `:crossed_swords: ${opponent.toString()} accepted ${challenger.toString()}'s challenge!`,
										footer: { text: `Waiting for ${challenger.username}...` },
										color: "#bbbbff"
									}));
	
								}
								opponentCollector.stop();
							});
						});	
					});

				} else if (user.id === opponent.id) {

					// Challenge declined
					message.reactions.removeAll();
					message.edit(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: `:no_entry_sign: ${opponent.toString()} declined ${challenger.toString()}'s challenge.`,
						color: "#ff0000"
					}));

				} else {

					// Challenge cancelled
					message.delete();

				}
				collector.stop();
			});
		});
	}
	msg.delete();

	/**
	 * Returns the emoji corresponding to the option.
	 * @param {Number} option - The number representing the choice.
	 */
	function optionEmoji(option) {
		switch (option) {
			case 0:
				return ":rock:";
			case 1:
				return ":page_facing_up:";
			case 2:
				return ":scissors:";
		}
	}

	/**
	 * Updates the embedded messages to show the outcome.
	 * @param {{}} game - The game object.
	 * @param {Discord.Message} message - The public embedded message.
	 * @param {Discord.Message} pmc - The challenger's private message.
	 * @param {Discord.Message} pmo - The opponent's private message.
	 */
	function outputWinner(game, message, pmc, pmo) {
		if (game.challenger === game.opponent) {
			
			// Tie
			message.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: "The game is a draw!" }
			}));
			pmc.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ffe100",
				footer: { text: "The game is a draw!" }
			}));
			pmo.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ffe100",
				footer: { text: "The game is a draw!" }
			}));

			checkUndefined(message.guild, challenger, opponent);
			stat[message.guild.id].rps[challenger.id].draw++;
			stat[message.guild.id].rps[opponent.id].draw++;
			stat[message.guild.id].rps[challenger.id][opponent.id].draw++;
			stat[message.guild.id].rps[opponent.id][challenger.id].draw++;

		} else if (game.challenger === (game.opponent + 1) % 3) {

			// Challenger wins
			message.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: `${challenger.username} wins!` }
			}));
			pmc.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: "You won!" }
			}));
			pmo.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ff0000",
				footer: { text: "You lost!" }
			}));

			checkUndefined(message.guild, challenger, opponent);
			stat[message.guild.id].rps[challenger.id].win++;
			stat[message.guild.id].rps[opponent.id].loss++;
			stat[message.guild.id].rps[challenger.id][opponent.id].win++;
			stat[message.guild.id].rps[opponent.id][challenger.id].loss++;

		} else {

			// Opponent wins
			message.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: `${opponent.username} wins!` }
			}));
			pmc.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ff0000",
				footer: { text: "You lost!" }
			}));
			pmo.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionEmoji(game.challenger)} vs. ${optionEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: "You won!" }
			}));

			checkUndefined(message.guild, challenger, opponent);
			stat[message.guild.id].rps[challenger.id].loss++;
			stat[message.guild.id].rps[opponent.id].win++;
			stat[message.guild.id].rps[challenger.id][opponent.id].loss++;
			stat[message.guild.id].rps[opponent.id][challenger.id].win++;

		}
		saveStats();
	}
	
	/**
	 * Checks for undefined stats and creates empty data
	 * if necessary.
	 * @param {Discord.User} challenger - A challenger.
	 * @param {Discord.User} opponent - An opponent.
	 */
	function checkUndefined(guild, challenger, opponent) {
		if (stat[guild.id] === undefined) stat[guild.id] = {};
		if (stat[guild.id].rps === undefined) stat[guild.id].rps = {};
		if (challenger !== undefined) if (stat[guild.id].rps[challenger.id] === undefined) stat[guild.id].rps[challenger.id] = { win: 0, draw: 0, loss: 0 };
		if (opponent !== undefined) if (stat[guild.id].rps[opponent.id] === undefined) stat[guild.id].rps[opponent.id] = { win: 0, draw: 0, loss: 0 };
		if (challenger !== undefined && opponent !== undefined) {
			if (stat[guild.id].rps[challenger.id][opponent.id] === undefined) stat[guild.id].rps[challenger.id][opponent.id] = { win: 0, draw: 0, loss: 0 };
			if (stat[guild.id].rps[opponent.id][challenger.id] === undefined) stat[guild.id].rps[opponent.id][challenger.id] = { win: 0, draw: 0, loss: 0 };
		}
	}
}

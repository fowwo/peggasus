const fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();

var config = {
	prefix: "!"
}
if (fs.existsSync("config.json")) config = JSON.parse(fs.readFileSync("config.json", "utf-8"));

const token = fs.readFileSync("token.txt", "utf-8").trim();
client.login(token);

client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));

client.on('message', (msg) => {
	if (msg.content.startsWith(config.prefix)) {
		let args = msg.content.split(" ");
		let command = args.shift().substring(config.prefix.length);
		switch (command) {
			case "config":
				configCommand(args);
				break;
			case "rps":
				rockPaperScissorsCommand(msg);
				break;
			default:
				// Invalid command
				break;
		}
	}
});

function saveConfig() {
	fs.writeFile("config.json", JSON.stringify(config, null, 4), (err) => { if (err) throw err; });
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
function rockPaperScissorsCommand(msg) {
	let challenger = msg.author;
	let opponent = msg.mentions.users.array()[0];
	
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
				message.reactions.removeAll();
				if (reaction.emoji.name === "✅") {

					// Challenge accepted
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

		}
	}
	
}

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
			case "tic-tac-toe":
			case "tictactoe":
			case "ttt":
				ticTacToeCommand(msg, args);
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
				let ao = { win: a[1].win.rock + a[1].win.paper + a[1].win.scissors, draw: a[1].draw.rock + a[1].draw.paper + a[1].draw.scissors, loss: a[1].loss.rock + a[1].loss.paper + a[1].loss.scissors };
				let bo = { win: b[1].win.rock + b[1].win.paper + b[1].win.scissors, draw: b[1].draw.rock + b[1].draw.paper + b[1].draw.scissors, loss: b[1].loss.rock + b[1].loss.paper + b[1].loss.scissors };
				let x = (ao.win + 0.5 * ao.draw) / (ao.win + ao.draw + ao.loss);
				let y = (bo.win + 0.5 * bo.draw) / (bo.win + bo.draw + bo.loss);
				if (x < y) return 1;
				else if (x > y) return -1;
				else if (ao.win < bo.win) return 1;
				else if (ao.win > bo.win) return -1;
				return 0;
			});
			if (mentions.length === 1) {
				if (stat[msg.guild.id].rps[mentions[0].id] !== undefined) {
					let rank = 0;
					for (rank = 0; rank < arr.length; rank++) {
						if (arr[rank][0] == mentions[0].id) {
							rank++;
							break;
						}
					}
					let user = stat[msg.guild.id].rps[mentions[0].id];
					let str = "";
					switch (rank) {
						case 1:
							str = `\n:first_place:`;
							break;
						case 2:
							str = `\n:second_place:`;
							break;
						case 3:
							str = `\n:third_place:`;
							break;
						default:
							str = `\n**${rank}.**`;
							break;
					}
					let o = { win: user.win.rock + user.win.paper + user.win.scissors, draw: user.draw.rock + user.draw.paper + user.draw.scissors, loss: user.loss.rock + user.loss.paper + user.loss.scissors };
					let x = (o.win + 0.5 * o.draw) / (o.win + o.draw + o.loss);
					str += ` **${mentions[0].username}** (${x.toFixed(3)})\n-- **${o.win}** win${o.win === 1 ? "" : "s"} / **${o.draw}** tie${o.draw === 1 ? "" : "s"} / **${o.loss}** loss${o.loss === 1 ? "" : "es"}\n-- **${user.win.rock + user.draw.rock + user.loss.rock}** :rock: / **${user.win.paper + user.draw.paper + user.loss.paper}** :page_facing_up: / **${user.win.scissors + user.draw.scissors + user.loss.scissors}** :scissors:`;

					let idArr = arr.map(x => x[0]).filter((x) => { return stat[msg.guild.id].rps[mentions[0].id][x] !== undefined });
					msg.guild.members.fetch({ user: idArr }).then((users) => {
						for (var opp of Object.keys(user)) {
							if (opp == "win" || opp == "draw" || opp == "loss") continue;
							str += `\n${mentions[0].username} - **${user[opp].win.rock + user[opp].win.paper + user[opp].win.scissors}** / **${user[opp].draw.rock + user[opp].draw.paper + user[opp].draw.scissors}** / **${user[opp].loss.rock + user[opp].loss.paper + user[opp].loss.scissors}** - ${users.get(opp).user.username}`;
						}
						msg.channel.send(new Discord.MessageEmbed({ 
							title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
							description: str,
							footer: { text: `Listing ${mentions[0].username}'s stats.` },
							color: "#faa61a"
						}));
					});
				} else {
					msg.channel.send(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: `${mentions[0].toString()} hasn't played Rock Paper Scissors yet.`,
						color: "#faa61a"
					}));
				}
				msg.delete();
			} else {
				if (arr.length !== 0) {
					let rank = 1;
					let idArr = arr.map(x => x[0]);
					msg.guild.members.fetch({ user: idArr }).then((users) => {
						let o = { win: arr[0][1].win.rock + arr[0][1].win.paper + arr[0][1].win.scissors, draw: arr[0][1].draw.rock + arr[0][1].draw.paper + arr[0][1].draw.scissors, loss: arr[0][1].loss.rock + arr[0][1].loss.paper + arr[0][1].loss.scissors };
						let str = `:first_place: **${users.get(arr[0][0]).user.username}** (${((o.win + 0.5 * o.draw) / (o.win + o.draw + o.loss)).toFixed(3)})\n-- **${o.win}** win${o.win === 1 ? "" : "s"} / **${o.draw}** tie${o.draw === 1 ? "" : "s"} / **${o.loss}** loss${o.loss === 1 ? "" : "es"}`;
						for (var i = 1; i < arr.length; i++) {
							let ao = { win: arr[i][1].win.rock + arr[i][1].win.paper + arr[i][1].win.scissors, draw: arr[i][1].draw.rock + arr[i][1].draw.paper + arr[i][1].draw.scissors, loss: arr[i][1].loss.rock + arr[i][1].loss.paper + arr[i][1].loss.scissors };
							let bo = { win: arr[i - 1][1].win.rock + arr[i - 1][1].win.paper + arr[i - 1][1].win.scissors, draw: arr[i - 1][1].draw.rock + arr[i - 1][1].draw.paper + arr[i - 1][1].draw.scissors, loss: arr[i - 1][1].loss.rock + arr[i - 1][1].loss.paper + arr[i - 1][1].loss.scissors };		
							let x = (ao.win + 0.5 * ao.draw) / (ao.win + ao.draw + ao.loss);
							let y = (bo.win + 0.5 * bo.draw) / (bo.win + bo.draw + bo.loss);
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
							str += ` **${users.get(arr[i][0]).user.username}** (${x.toFixed(3)})\n-- **${ao.win}** win${ao.win === 1 ? "" : "s"} / **${ao.draw}** tie${ao.draw === 1 ? "" : "s"} / **${ao.loss}** loss${ao.loss === 1 ? "" : "es"}`;
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
			}
			return;
	}

	let challenger = msg.author;
	let opponent = mentions[0];
	if (opponent === undefined) return;
	
	if (opponent.id === client.user.id) {
		msg.channel.send(new Discord.MessageEmbed({ 
			title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
			description: `What will you use against ${opponent.username}, ${challenger.toString()}?`,
			footer: { text: "Choose an item." },
			color: "#faa61a"
		})).then((message) => {
			message.react("🪨");
			message.react("📄");
			message.react("✂️");

			let collector = message.createReactionCollector((reaction, user) => 
				user.id === challenger.id && (reaction.emoji.name === "🪨" || reaction.emoji.name === "📄" || reaction.emoji.name === "✂️")
			).once("collect", (reaction) => {
				let game = { challenger: null, opponent: null };
				if (reaction.emoji.name === "🪨") {
					game.challenger = 0;
				} else if (reaction.emoji.name === "📄") {
					game.challenger = 1;
				} else {
					game.challenger = 2;
				}
				game.opponent = Math.floor(Math.random() * 3);
				outputWinner(game, message);
				message.reactions.removeAll();
				collector.stop();
			});
		});
	} else if (challenger.id === opponent.id) {
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
			description: `:no_entry_sign: You can't challenge other bots, ${challenger.toString()}.`,
			color: "#ff0000"
		})).then((message) => {
			setTimeout(() => { message.delete(); }, 5000);
		});
	} else {
		let embed = new Discord.MessageEmbed({ 
			title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
			description: `:crossed_swords: ${challenger.toString()} is challenging ${opponent.toString()} to a game of Rock Paper Scissors!`,
			footer: { text: `${opponent.username} has 90 seconds to accept.` },
			color: "#faa61a" 
		});
		msg.channel.send(embed).then((message) => {
			message.react("✅");
			message.react("❌");
			let timeout = setTimeout(() => {
				message.reactions.removeAll();
				message.edit(new Discord.MessageEmbed({ 
					title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
					description: `:clock5: ${challenger.toString()}'s challenge to ${opponent.toString()} has timed out.`,
					footer: { text: `${opponent.username} did not accept in time.` },
					color: "#606060"
				}));
				collector.stop();
			}, 90000);
			let collector = message.createReactionCollector((reaction, user) => 
				(user.id === challenger.id && reaction.emoji.name === "❌") ||
				(user.id === opponent.id && (reaction.emoji.name === "✅" || reaction.emoji.name === "❌"))
			).once("collect", (reaction, user) => {
				clearTimeout(timeout);
				if (reaction.emoji.name === "✅") {

					// Challenge accepted
					message.reactions.removeAll();
					message.edit(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: `:crossed_swords: ${opponent.toString()} accepted ${challenger.toString()}'s challenge!`,
						footer: { text: "Waiting for both players..." },
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
									footer: { text: `Waiting for ${opponent.username}...` },
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
									footer: { text: `Waiting for ${challenger.username}...` },
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
	function optionToEmoji(option) {
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
	 * Returns the key name corresponding to the option.
	 * @param {Number} option - The option.
	 */
	function optionToKey(option) {
		switch (option) {
			case 0:
				return "rock";
			case 1:
				return "paper";
			case 2:
				return "scissors";
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
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: "The game is a draw!" }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ffe100",
				footer: { text: "The game is a draw!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ffe100",
				footer: { text: "The game is a draw!" }
			}));

			checkUndefined(message.guild, challenger, opponent);
			stat[message.guild.id].rps[challenger.id].draw[optionToKey(game.challenger)]++;
			stat[message.guild.id].rps[opponent.id].draw[optionToKey(game.opponent)]++;
			stat[message.guild.id].rps[challenger.id][opponent.id].draw[optionToKey(game.opponent)]++;
			stat[message.guild.id].rps[opponent.id][challenger.id].draw[optionToKey(game.challenger)]++;

		} else if (game.challenger === (game.opponent + 1) % 3) {

			// Challenger wins
			message.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: `${challenger.username} wins!` }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: "You won!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ff0000",
				footer: { text: "You lost!" }
			}));

			checkUndefined(message.guild, challenger, opponent);
			stat[message.guild.id].rps[challenger.id].win[optionToKey(game.challenger)]++;
			stat[message.guild.id].rps[opponent.id].loss[optionToKey(game.opponent)]++;
			stat[message.guild.id].rps[challenger.id][opponent.id].win[optionToKey(game.opponent)]++;
			stat[message.guild.id].rps[opponent.id][challenger.id].loss[optionToKey(game.challenger)]++;

		} else {

			// Opponent wins
			message.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: `${opponent.username} wins!` }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#ff0000",
				footer: { text: "You lost!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: `${challenger.toString()} ${optionToEmoji(game.challenger)} vs. ${optionToEmoji(game.opponent)} ${opponent.toString()}`,
				color: "#00ff00",
				footer: { text: "You won!" }
			}));

			checkUndefined(message.guild, challenger, opponent);
			stat[message.guild.id].rps[challenger.id].loss[optionToKey(game.challenger)]++;
			stat[message.guild.id].rps[opponent.id].win[optionToKey(game.opponent)]++;
			stat[message.guild.id].rps[challenger.id][opponent.id].loss[optionToKey(game.opponent)]++;
			stat[message.guild.id].rps[opponent.id][challenger.id].win[optionToKey(game.challenger)]++;

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
		if (challenger !== undefined) if (stat[guild.id].rps[challenger.id] === undefined) stat[guild.id].rps[challenger.id] = { win: { rock: 0, paper: 0, scissors: 0 }, draw: { rock: 0, paper: 0, scissors: 0 }, loss: { rock: 0, paper: 0, scissors: 0 } };
		if (opponent !== undefined) if (stat[guild.id].rps[opponent.id] === undefined) stat[guild.id].rps[opponent.id] = { win: { rock: 0, paper: 0, scissors: 0 }, draw: { rock: 0, paper: 0, scissors: 0 }, loss: { rock: 0, paper: 0, scissors: 0 } };
		if (challenger !== undefined && opponent !== undefined) {
			if (stat[guild.id].rps[challenger.id][opponent.id] === undefined) stat[guild.id].rps[challenger.id][opponent.id] = { win: { rock: 0, paper: 0, scissors: 0 }, draw: { rock: 0, paper: 0, scissors: 0 }, loss: { rock: 0, paper: 0, scissors: 0 } };
			if (stat[guild.id].rps[opponent.id][challenger.id] === undefined) stat[guild.id].rps[opponent.id][challenger.id] = { win: { rock: 0, paper: 0, scissors: 0 }, draw: { rock: 0, paper: 0, scissors: 0 }, loss: { rock: 0, paper: 0, scissors: 0 } };
		}
	}
}

/**
 * Used to start Tic-Tac-Toe games.
 * 
 * `!ttt` `!tictactoe` `!tic-tac-toe`
 * @param {Discord.Message} msg 
 * @param {String[]} args 
 */
function ticTacToeCommand(msg, args) {

	let mentions = msg.mentions.users.array();
	const embedTitle = ":x: :o: :x: Tic-Tac-Toe";

	let challenger = msg.author;
	let opponent = mentions[0];
	if (opponent === undefined) return;
	
	if (challenger.id === opponent.id) {
		msg.channel.send(new Discord.MessageEmbed({ 
			title: embedTitle,
			description: `:no_entry_sign: You can't challenge yourself, ${challenger.toString()}!`,
			color: "#ff0000"
		})).then((message) => {
			setTimeout(() => { message.delete(); }, 5000);
		});
	} else if (challenger.bot || opponent.bot) {
		msg.channel.send(new Discord.MessageEmbed({ 
			title: embedTitle,
			description: `:no_entry_sign: You can't challenge bots, ${challenger.toString()}.`,
			color: "#ff0000"
		})).then((message) => {
			setTimeout(() => { message.delete(); }, 5000);
		});
	} else {
		let embed = new Discord.MessageEmbed({ 
			title: embedTitle,
			description: `:crossed_swords: ${challenger.toString()} is challenging ${opponent.toString()} to a game of Tic-Tac-Toe!`,
			footer: { text: `${opponent.username} has 90 seconds to accept.` },
			color: "#faa61a" 
		});
		msg.channel.send(embed).then((message) => {
			message.react("✅");
			message.react("❌");
			let timeout = setTimeout(() => {
				message.reactions.removeAll();
				message.edit(new Discord.MessageEmbed({ 
					title: embedTitle,
					description: `:clock5: ${challenger.toString()}'s challenge to ${opponent.toString()} has timed out.`,
					footer: { text: `${opponent.username} did not accept in time.` },
					color: "#606060"
				}));
				collector.stop();
			}, 90000);
			let collector = message.createReactionCollector((reaction, user) => 
				(user.id === challenger.id && reaction.emoji.name === "❌") ||
				(user.id === opponent.id && (reaction.emoji.name === "✅" || reaction.emoji.name === "❌"))
			).once("collect", (reaction, user) => {
				clearTimeout(timeout);
				if (reaction.emoji.name === "✅") {

					// Challenge accepted
					message.reactions.removeAll();
	
					let players = [ msg.author, mentions[0] ];
					let game = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
					let turn = 1;
					const xPlayer = players.splice(Math.round(Math.random()), 1)[0];
					const oPlayer = players.pop();

					message.edit(new Discord.MessageEmbed({ 
						title: embedTitle,
						description: makeBoard(game, xPlayer, oPlayer),
						footer: { text: `${xPlayer.username}'s turn.` },
						color: "#bbbbff"
					}));
					message.react("1️⃣");
					message.react("2️⃣");
					message.react("3️⃣");
					message.react("4️⃣");
					message.react("5️⃣");
					message.react("6️⃣");
					message.react("7️⃣");
					message.react("8️⃣");
					message.react("9️⃣");
					
					let gameCollector = message.createReactionCollector((reaction, user) => 
						((user.id === xPlayer.id && turn === 1) || (user.id === oPlayer.id && turn === 2)) && emojiToIndex(reaction.emoji) !== -1
					).on("collect", (reaction, user) => {
						let i = emojiToIndex(reaction.emoji);
						if (game[i] === 0) {
							game[i] = turn;
							turn = turn % 2 + 1;
							let win = determineOutcome(game);
							if (win !== -1) {
								checkUndefined(message.guild, xPlayer, oPlayer);
								if (win === 1) {
									// X wins.
									message.edit(new Discord.MessageEmbed({ 
										title: embedTitle,
										description: makeBoard(game, xPlayer, oPlayer),
										color: "#00ff00",
										footer: { text: `${xPlayer.username} wins!` }
									}));
						
									stat[message.guild.id].ttt[xPlayer.id].win.x++;
									stat[message.guild.id].ttt[oPlayer.id].loss.o++;
									stat[message.guild.id].ttt[xPlayer.id][oPlayer.id].win.x++;
									stat[message.guild.id].ttt[oPlayer.id][xPlayer.id].loss.o++;
								} else if (win === 2) {
									// O wins.
									message.edit(new Discord.MessageEmbed({ 
										title: embedTitle,
										description: makeBoard(game, xPlayer, oPlayer),
										color: "#00ff00",
										footer: { text: `${oPlayer.username} wins!` }
									}));

									stat[message.guild.id].ttt[xPlayer.id].loss.x++;
									stat[message.guild.id].ttt[oPlayer.id].win.o++;
									stat[message.guild.id].ttt[xPlayer.id][oPlayer.id].loss.x++;
									stat[message.guild.id].ttt[oPlayer.id][xPlayer.id].win.o++;
								} else {
									// The game is a draw.
									message.edit(new Discord.MessageEmbed({ 
										title: embedTitle,
										description: makeBoard(game, xPlayer, oPlayer),
										color: "#00ff00",
										footer: { text: "The game is a draw!" }
									}));

									stat[message.guild.id].ttt[xPlayer.id].draw.x++;
									stat[message.guild.id].ttt[oPlayer.id].draw.o++;
									stat[message.guild.id].ttt[xPlayer.id][oPlayer.id].draw.x++;
									stat[message.guild.id].ttt[oPlayer.id][xPlayer.id].draw.o++;
								}
								saveStats();
								gameCollector.stop();
							} else {
								message.edit(new Discord.MessageEmbed({ 
									title: embedTitle,
									description: makeBoard(game, xPlayer, oPlayer),
									color: "#bbbbff",
									footer: { text: `${turn === 1 ? xPlayer.username : oPlayer.username}'s turn.` }
								}));
							}
						}
					});

				} else if (user.id === opponent.id) {

					// Challenge declined
					message.reactions.removeAll();
					message.edit(new Discord.MessageEmbed({ 
						title: embedTitle,
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
	 * Draws the board from the given game data.
	 * @param {Number[]} game - The game data.
	 * @param {Discord.User} xPlayer
	 * @param {Discord.User} oPlayer
	 */
	function makeBoard(game, xPlayer, oPlayer) {
		return `\`\`\`elm\n${game[0] === 0 ? '1' : game[0] === 1 ? 'X' : 'O'} │ ${game[1] === 0 ? '2' : game[1] === 1 ? 'X' : 'O'} │ ${game[2] === 0 ? '3' : game[2] === 1 ? 'X' : 'O'}\n──┼───┼──    X - ${xPlayer.username}   \n${game[3] === 0 ? '4' : game[3] === 1 ? 'X' : 'O'} │ ${game[4] === 0 ? '5' : game[4] === 1 ? 'X' : 'O'} │ ${game[5] === 0 ? '6' : game[5] === 1 ? 'X' : 'O'}\n──┼───┼──    O - ${oPlayer.username}   \n${game[6] === 0 ? '7' : game[6] === 1 ? 'X' : 'O'} │ ${game[7] === 0 ? '8' : game[7] === 1 ? 'X' : 'O'} │ ${game[8] === 0 ? '9' : game[8] === 1 ? 'X' : 'O'}\`\`\``;
	}

	/**
	 * Returns the index corresponding to an emoji.
	 * @param {Discord.Emoji} emoji - The emoji.
	 */
	function emojiToIndex(emoji) {
		switch (emoji.name) {
			case "1️⃣":
				return 0;
			case "2️⃣":
				return 1;
			case "3️⃣":
				return 2;
			case "4️⃣":
				return 3;
			case "5️⃣":
				return 4;
			case "6️⃣":
				return 5;
			case "7️⃣":
				return 6;
			case "8️⃣":
				return 7;
			case "9️⃣":
				return 8;
			default:
				return -1;
		}
	}

	/**
	 * Checks if the game has a winner.
	 * @param {Number[]} game - The game data.
	 */
	function determineOutcome(game) {
		if ((game[0] !== 0 && game[0] === game[1] && game[1] === game[2])) return game[0]; // Top Row
		if ((game[3] !== 0 && game[3] === game[4] && game[4] === game[5])) return game[3]; // Middle Row
		if ((game[6] !== 0 && game[6] === game[7] && game[7] === game[8])) return game[6]; // Bottom Row
		if ((game[0] !== 0 && game[0] === game[3] && game[3] === game[6])) return game[0]; // Left Column
		if ((game[1] !== 0 && game[1] === game[4] && game[4] === game[7])) return game[1]; // Middle Column
		if ((game[2] !== 0 && game[2] === game[5] && game[5] === game[8])) return game[2]; // Right Column
		if ((game[0] !== 0 && game[0] === game[4] && game[4] === game[8])) return game[0]; // Down-Right
		if ((game[2] !== 0 && game[2] === game[4] && game[4] === game[6])) return game[2]; // Down-Left

		if (game.indexOf(0) === -1) return 0; // The game is a draw.
		return -1; // The game is still in progress.
	}
	
	/**
	 * Checks for undefined stats and creates empty data
	 * if necessary.
	 * @param {Discord.User} xPlayer
	 * @param {Discord.User} oPlayer
	 */
	function checkUndefined(guild, xPlayer, oPlayer) {
		if (stat[guild.id] === undefined) stat[guild.id] = {};
		if (stat[guild.id].ttt === undefined) stat[guild.id].ttt = {};
		if (xPlayer !== undefined) if (stat[guild.id].ttt[xPlayer.id] === undefined) stat[guild.id].ttt[xPlayer.id] = { win: { x: 0, o: 0 }, draw: { x: 0, o: 0 }, loss: { x: 0, o: 0 } };
		if (oPlayer !== undefined) if (stat[guild.id].ttt[oPlayer.id] === undefined) stat[guild.id].ttt[oPlayer.id] = { win: { x: 0, o: 0 }, draw: { x: 0, o: 0 }, loss: { x: 0, o: 0 } };
		if (xPlayer !== undefined && oPlayer !== undefined) {
			if (stat[guild.id].ttt[xPlayer.id][oPlayer.id] === undefined) stat[guild.id].ttt[xPlayer.id][oPlayer.id] = { win: { x: 0, o: 0 }, draw: { x: 0, o: 0 }, loss: { x: 0, o: 0 } };
			if (stat[guild.id].ttt[oPlayer.id][xPlayer.id] === undefined) stat[guild.id].ttt[oPlayer.id][xPlayer.id] = { win: { x: 0, o: 0 }, draw: { x: 0, o: 0 }, loss: { x: 0, o: 0 } };
		}
	}
}

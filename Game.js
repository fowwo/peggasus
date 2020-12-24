const Discord = require("discord.js");

const defaultColor = "#faa61a";
const successColor = "#00ff00";
const failColor = "#ff0000";
const pendingColor = "#bbbbff";
const cancelledColor = "#606060";
const lossColor = "#ff0000";
const winColor = "#00ff00";
const drawColor = "#ffe100";
const badMessageTimeout = 5000;

/**
 * Models an abstract game.
 */
class Game {
	
	/**
	 * @param {Discord.Client} client - The client.
	 * @param {Discord.TextChannel} channel - The channel where the game is created.
	 * @param {{}} stat - The object containing game stats.
	 * @param {String} title - The name of the game.
	 * @param {String} code - The shorthand name of the game.
	 * @param {String} prefix - The game title's prefix.
	 */
	constructor(client, channel, stat, title, code, prefix) {
		if (new.target === Game) throw new TypeError("Cannot create instance of an abstract game.");
		this.client = client;
		this.channel = channel;
		this.stat = stat;
		this.title = title;
		this.code = code;
		this.prefix = prefix;
		this.endFunction = () => {};
	}

	onEnd(fn) {
		this.endFunction = fn;
	}

	toString() {
		return `${this.prefix} ${this.title}`;
	}

}

/**
 * Models an abstract two-player game.
 */
class Duel extends Game {
	
	/**
	 * @param {Discord.Client} client - The client.
	 * @param {Discord.TextChannel} channel - The channel where the game is created.
	 * @param {{}} stat - The object containing game stats.
	 * @param {String} title - The name of the game.
	 * @param {String} code - The shorthand name of the game.
	 * @param {String} prefix - The game title's prefix.
	 * @param {Discord.User} challenger - The user initiating the duel.
	 * @param {Discord.User} opponent - The user being faced against.
	 * @param {Boolean} allowBotOpponent - Whether or not a user can challenge the bot.
	 */
	constructor(client, channel, stat, title, code, prefix, challenger, opponent, allowBotOpponent = false) {
		if (new.target === Duel) throw new TypeError("Cannot create instance of an abstract duel.");
		super(client, channel, stat, title, code, prefix);
		this.challenger = challenger;
		this.opponent = opponent;
		this.allowBotOpponent = allowBotOpponent;

		// Required methods
		if (this.play === undefined) throw new Error(`${new.target.name} is missing the 'play(message)' method.`);
	}

	/**
	 * Creates a challenge request.
	 * @param {Number} timeout - How long the challenge request will last in milliseconds.
	 */
	challenge(timeout = 90000) {
		if (this.challenger.id === this.opponent.id) {
			this.channel.send(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `:no_entry_sign: You can't challenge yourself, ${this.challenger.toString()}!`,
				color: failColor
			})).then((message) => { setTimeout(() => { message.delete(); }, badMessageTimeout); });
		} else if (this.challenger.bot) {
			this.channel.send(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `:no_entry_sign: Bots can't initiate challenges!`,
				color: failColor
			})).then((message) => { setTimeout(() => { message.delete(); }, badMessageTimeout); });
		} else if (this.opponent.bot) {
			if (!this.allowBotOpponent) {
				this.channel.send(new Discord.MessageEmbed({ 
					title: this.toString(),
					description: `:no_entry_sign: You can't challenge bots, ${this.challenger.toString()}.`,
					color: failColor
				})).then((message) => { setTimeout(() => { message.delete(); }, badMessageTimeout); });
			} else if (this.opponent.id === this.client.user.id) {
				this.play();
			} else {
				this.channel.send(new Discord.MessageEmbed({ 
					title: this.toString(),
					description: `:no_entry_sign: You can't challenge other bots, ${this.challenger.toString()}.`,
					color: failColor
				})).then((message) => { setTimeout(() => { message.delete(); }, badMessageTimeout); });
			}
		} else {
			this.channel.send(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `:crossed_swords: ${this.challenger.toString()} is challenging ${this.opponent.toString()} to a game of ${this.title}!`,
				footer: { text: `${this.opponent.username} has ${timeout / 1000} second${timeout / 1000 === 1 ? "" : "s"} to accept.` },
				color: defaultColor
			})).then((message) => {
				message.react("✅");
				message.react("❌");
				let timer = setTimeout(() => {
					message.reactions.removeAll();
					message.edit(new Discord.MessageEmbed({ 
						title: this.toString(),
						description: `:clock5: ${this.challenger.toString()}'s challenge to ${this.opponent.toString()} has timed out.`,
						footer: { text: `${this.opponent.username} did not accept in time.` },
						color: cancelledColor
					}));
					collector.stop();
				}, timeout);
				let collector = message.createReactionCollector((reaction, user) => 
					(user.id === this.challenger.id && reaction.emoji.name === "❌") ||
					(user.id === this.opponent.id && (reaction.emoji.name === "✅" || reaction.emoji.name === "❌"))
				).once("collect", (reaction, user) => {
					clearTimeout(timer);
					if (reaction.emoji.name === "✅") {
	
						// Challenge accepted
						message.reactions.removeAll();
						this.play(message);
	
					} else if (user.id === this.opponent.id) {
	
						// Challenge declined
						message.reactions.removeAll();
						message.edit(new Discord.MessageEmbed({ 
							title: this.toString(),
							description: `:no_entry_sign: ${this.opponent.toString()} declined ${this.challenger.toString()}'s challenge.`,
							color: failColor
						}));
	
					} else {
	
						// Challenge cancelled
						message.delete();
	
					}
					collector.stop();
				});
			});
		}
	}

	/**
	 * Checks for undefined stats and creates data if necessary.
	 * @param {{}} stat - The object containing game stats.
	 * @param {Discord.Guild} guild - The guild in which the game is being played.
	 * @param {String} code - The shorthand name of the game.
	 * @param {Discord.User} user1
	 * @param {Discord.User} user2
	 * @param {} defaultData - The data to create for undefined stats.
	 */
	static checkUndefined(stat, guild, code, user1, user2, defaultData) {
		if (stat[guild.id] === undefined) stat[guild.id] = {};
		if (stat[guild.id][code] === undefined) stat[guild.id][code] = {};
		if (user1 !== undefined) if (stat[guild.id][code][user1.id] === undefined) stat[guild.id][code][user1.id] = JSON.parse(JSON.stringify(defaultData));
		if (user2 !== undefined) if (stat[guild.id][code][user2.id] === undefined) stat[guild.id][code][user2.id] = JSON.parse(JSON.stringify(defaultData));
		if (user1 !== undefined && user2 !== undefined) {
			if (stat[guild.id][code][user1.id][user2.id] === undefined) stat[guild.id][code][user1.id][user2.id] = JSON.parse(JSON.stringify(defaultData));
			if (stat[guild.id][code][user2.id][user1.id] === undefined) stat[guild.id][code][user2.id][user1.id] = JSON.parse(JSON.stringify(defaultData));
		}
	}

}

/**
 * Models a game of Rock Paper Scissors.
 */
class RockPaperScissors extends Duel {

	constructor(client, channel, stat, challenger, opponent) {
		super(client, channel, stat, "Rock Paper Scissors", "rps", ":rock: :page_facing_up: :scissors:", challenger, opponent, true);
	}

	/**
	 * Starts the game.
	 * @param {Discord.Message} message - The message to edit, or nothing if no message was made.
	 */
	play(message) {
		if (this.opponent.id === this.client.user.id) {
			this.channel.send(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `What will you use against ${this.opponent.username}, ${this.challenger.toString()}?`,
				footer: { text: "Choose an item." },
				color: defaultColor
			})).then((message) => {
				message.react("🪨");
				message.react("📄");
				message.react("✂️");
	
				let collector = message.createReactionCollector((reaction, user) => 
					user.id === this.challenger.id && (reaction.emoji.name === "🪨" || reaction.emoji.name === "📄" || reaction.emoji.name === "✂️")
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
					message.reactions.removeAll();
					this.endGame(game, message);
					collector.stop();
				});
			});
		} else {
			message.edit(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `:crossed_swords: ${this.opponent.toString()} accepted ${this.challenger.toString()}'s challenge!`,
				footer: { text: "Waiting for both players..." },
				color: pendingColor
			}));
	
			let game = { challenger: null, opponent: null };
			this.challenger.send(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `What will you use against ${this.opponent.username}?`,
				footer: { text: "Choose an item." },
				color: defaultColor
			})).then((pmc) => {
				this.opponent.send(new Discord.MessageEmbed({ 
					title: this.toString(),
					description: `What will you use against ${this.challenger.username}?`,
					footer: { text: "Choose an item." },
					color: defaultColor
				})).then((pmo) => {
	
					pmc.react("🪨");
					pmc.react("📄");
					pmc.react("✂️");
					pmo.react("🪨");
					pmo.react("📄");
					pmo.react("✂️");
	
					let challengerCollector = pmc.createReactionCollector((reaction, user) => 
						user.id === this.challenger.id && (reaction.emoji.name === "🪨" || reaction.emoji.name === "📄" || reaction.emoji.name === "✂️")
					).once("collect", (reaction) => {
						let newEmbed = new Discord.MessageEmbed({ 
							title: this.toString(),
							footer: { text: `Waiting for ${this.opponent.username}...` },
							color: pendingColor
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
							this.endGame(game, message, pmc, pmo);
	
						} else {
	
							// Waiting for opponent
							pmc.edit(newEmbed);
							message.edit(new Discord.MessageEmbed({ 
								title: this.toString(),
								description: `:crossed_swords: ${this.opponent.toString()} accepted ${this.challenger.toString()}'s challenge!`,
								footer: { text: `Waiting for ${this.opponent.username}...` },
								color: pendingColor
							}));
	
						}
						challengerCollector.stop();
					});
					let opponentCollector = pmo.createReactionCollector((reaction, user) => 
						user.id === this.opponent.id && (reaction.emoji.name === "🪨" || reaction.emoji.name === "📄" || reaction.emoji.name === "✂️")
					).once("collect", (reaction) => {
						let newEmbed = new Discord.MessageEmbed({ 
							title: this.toString(),
							footer: { text: `Waiting for ${this.challenger.username}...` },
							color: pendingColor
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
							this.endGame(game, message, pmc, pmo);
	
						} else {
	
							// Waiting for opponent
							pmo.edit(newEmbed);
							message.edit(new Discord.MessageEmbed({ 
								title: this.toString(),
								description: `:crossed_swords: ${this.opponent.toString()} accepted ${this.challenger.toString()}'s challenge!`,
								footer: { text: `Waiting for ${this.challenger.username}...` },
								color: pendingColor
							}));
	
						}
						opponentCollector.stop();
					});
				});	
			});
		}
	}

	/**
	 * Checks for undefined stats and creates data if necessary.
	 */
	checkUndefined() {
		Duel.checkUndefined(this.stat, this.channel.guild, this.code, this.challenger, this.opponent,
			{ win: { rock: 0, paper: 0, scissors: 0 }, draw: { rock: 0, paper: 0, scissors: 0 }, loss: { rock: 0, paper: 0, scissors: 0 } }
		);
	}

	/**
	 * Updates the stats and embedded messages to show the outcome.
	 * @param {{}} game - The game object.
	 * @param {Discord.Message} message - The public embedded message.
	 * @param {Discord.Message} pmc - The challenger's private message.
	 * @param {Discord.Message} pmo - The opponent's private message.
	 */
	endGame(game, message, pmc, pmo) {
		this.checkUndefined();
		if (game.challenger === game.opponent) {

			// Tie
			message.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: successColor,
				footer: { text: "The game is a draw!" }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: drawColor,
				footer: { text: "The game is a draw!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: drawColor,
				footer: { text: "The game is a draw!" }
			}));

			this.stat[message.guild.id][this.code][this.challenger.id].draw[RockPaperScissors.optionToKey(game.challenger)]++;
			this.stat[message.guild.id][this.code][this.opponent.id].draw[RockPaperScissors.optionToKey(game.opponent)]++;
			this.stat[message.guild.id][this.code][this.challenger.id][this.opponent.id].draw[RockPaperScissors.optionToKey(game.challenger)]++;
			this.stat[message.guild.id][this.code][this.opponent.id][this.challenger.id].draw[RockPaperScissors.optionToKey(game.opponent)]++;

		} else if (game.challenger === (game.opponent + 1) % 3) {

			// Challenger wins
			message.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: successColor,
				footer: { text: `${this.challenger.username} wins!` }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: winColor,
				footer: { text: "You won!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: lossColor,
				footer: { text: "You lost!" }
			}));

			this.stat[message.guild.id][this.code][this.challenger.id].win[RockPaperScissors.optionToKey(game.challenger)]++;
			this.stat[message.guild.id][this.code][this.opponent.id].loss[RockPaperScissors.optionToKey(game.opponent)]++;
			this.stat[message.guild.id][this.code][this.challenger.id][this.opponent.id].win[RockPaperScissors.optionToKey(game.challenger)]++;
			this.stat[message.guild.id][this.code][this.opponent.id][this.challenger.id].loss[RockPaperScissors.optionToKey(game.opponent)]++;

		} else {

			// Opponent wins
			message.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: successColor,
				footer: { text: `${this.opponent.username} wins!` }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: lossColor,
				footer: { text: "You lost!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(game.challenger)} vs. ${RockPaperScissors.optionToEmoji(game.opponent)} ${this.opponent.toString()}`,
				color: winColor,
				footer: { text: "You won!" }
			}));

			this.stat[message.guild.id][this.code][this.challenger.id].loss[RockPaperScissors.optionToKey(game.challenger)]++;
			this.stat[message.guild.id][this.code][this.opponent.id].win[RockPaperScissors.optionToKey(game.opponent)]++;
			this.stat[message.guild.id][this.code][this.challenger.id][this.opponent.id].loss[RockPaperScissors.optionToKey(game.challenger)]++;
			this.stat[message.guild.id][this.code][this.opponent.id][this.challenger.id].win[RockPaperScissors.optionToKey(game.opponent)]++;

		}
		this.endFunction();
	}

	/**
	 * Makes a leaderboard for Rock Paper Scissors.
	 * @param {Discord.TextChannel} channel - The channel to send the leaderboard to.
	 * @param {{}} stat - The object containing game stats.
	 * @param {Discord.Guild} guild - The guild to list stats for.
	 * @param {Discord.User} user - (Optional) The user to list stats for.
	 */
	static sendLeaderboard(channel, stat, guild, user) {
		RockPaperScissors.checkUndefined(stat, guild, "rps");
		let arr = Object.entries(stat[guild.id].rps).sort((a, b) => {
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
		if (user !== undefined) {
			if (stat[guild.id].rps[user.id] !== undefined) {
				let rank = 0;
				for (rank = 0; rank < arr.length; rank++) {
					if (arr[rank][0] == user.id) {
						rank++;
						break;
					}
				}
				let userID = stat[guild.id].rps[user.id];
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
				let o = { win: userID.win.rock + userID.win.paper + userID.win.scissors, draw: userID.draw.rock + userID.draw.paper + userID.draw.scissors, loss: userID.loss.rock + userID.loss.paper + userID.loss.scissors };
				let x = (o.win + 0.5 * o.draw) / (o.win + o.draw + o.loss);
				str += ` **${user.username}** (${x.toFixed(3)})\n-- **${o.win}** win${o.win === 1 ? "" : "s"} / **${o.draw}** tie${o.draw === 1 ? "" : "s"} / **${o.loss}** loss${o.loss === 1 ? "" : "es"}\n-- **${userID.win.rock + userID.draw.rock + userID.loss.rock}** :rock: / **${userID.win.paper + userID.draw.paper + userID.loss.paper}** :page_facing_up: / **${userID.win.scissors + userID.draw.scissors + userID.loss.scissors}** :scissors:`;

				let idArr = arr.map(x => x[0]).filter((x) => { return stat[guild.id].rps[user.id][x] !== undefined });
				guild.members.fetch({ user: idArr }).then((users) => {
					for (var opp of Object.keys(userID)) {
						if (opp == "win" || opp == "draw" || opp == "loss") continue;
						str += `\n${user.username} - **${userID[opp].win.rock + userID[opp].win.paper + userID[opp].win.scissors}** / **${userID[opp].draw.rock + userID[opp].draw.paper + userID[opp].draw.scissors}** / **${userID[opp].loss.rock + userID[opp].loss.paper + userID[opp].loss.scissors}** - ${users.get(opp).user.username}`;
					}
					channel.send(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: str,
						footer: { text: `Listing ${user.username}'s stats.` },
						color: "#faa61a"
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
					description: `${user.toString()} hasn't played Rock Paper Scissors yet.`,
					color: "#faa61a"
				}));
			}
		} else {
			if (arr.length !== 0) {
				let rank = 1;
				let idArr = arr.map(x => x[0]);
				guild.members.fetch({ user: idArr }).then((users) => {
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
					channel.send(new Discord.MessageEmbed({ 
						title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
						description: str,
						footer: { text: `Listing the top ${arr.length} player${arr.length === 1 ? "" : "s"} sorted by WDL ratio.` },
						color: "#faa61a"
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
					description: "No players to list.",
					color: "#faa61a"
				}));
			}
		}
	}

	/**
	 * Returns the emoji corresponding to the option.
	 * @param {Number} option - The number representing the choice.
	 */
	static optionToEmoji(option) {
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
	static optionToKey(option) {
		switch (option) {
			case 0:
				return "rock";
			case 1:
				return "paper";
			case 2:
				return "scissors";
		}
	}

}

module.exports = {
	RockPaperScissors: RockPaperScissors
}

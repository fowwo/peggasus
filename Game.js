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
	 * Makes a leaderboard.
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
						color: defaultColor
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
					description: `${user.toString()} hasn't played Rock Paper Scissors yet.`,
					color: defaultColor
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
						color: defaultColor
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
					description: "No players to list.",
					color: defaultColor
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

/**
 * Models a game of Tic-Tac-Toe.
 */
class TicTacToe extends Duel {

	constructor(client, channel, stat, challenger, opponent) {
		super(client, channel, stat, "Tic-Tac-Toe", "ttt", ":x: :o: :x:", challenger, opponent);
	}

	/**
	 * Starts the game.
	 * @param {Discord.Message} message - The message to edit, or nothing if no message was made.
	 */
	play(message) {
		let players = [ this.challenger, this.opponent ];
		let game = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
		let turn = 1;
		const xPlayer = players.splice(Math.round(Math.random()), 1)[0];
		const oPlayer = players.pop();

		message.edit(new Discord.MessageEmbed({ 
			title: this.toString(),
			description: TicTacToe.makeBoard(game, xPlayer, oPlayer),
			footer: { text: `${xPlayer.username}'s turn.` },
			color: pendingColor
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
			((user.id === xPlayer.id && turn === 1) || (user.id === oPlayer.id && turn === 2)) && TicTacToe.emojiToIndex(reaction.emoji) !== -1
		).on("collect", (reaction, user) => {
			let i = TicTacToe.emojiToIndex(reaction.emoji);
			if (game[i] === 0) {
				game[i] = turn;
				turn = turn % 2 + 1;
				let win = TicTacToe.determineOutcome(game);
				if (win !== -1) {
					this.checkUndefined();
					if (win === 1) {
						// X wins.
						message.edit(new Discord.MessageEmbed({ 
							title: this.toString(),
							description: TicTacToe.makeBoard(game, xPlayer, oPlayer),
							color: successColor,
							footer: { text: `${xPlayer.username} wins!` }
						}));
			
						this.stat[message.guild.id].ttt[xPlayer.id].win.x++;
						this.stat[message.guild.id].ttt[oPlayer.id].loss.o++;
						this.stat[message.guild.id].ttt[xPlayer.id][oPlayer.id].win.x++;
						this.stat[message.guild.id].ttt[oPlayer.id][xPlayer.id].loss.o++;
					} else if (win === 2) {
						// O wins.
						message.edit(new Discord.MessageEmbed({ 
							title: this.toString(),
							description: TicTacToe.makeBoard(game, xPlayer, oPlayer),
							color: successColor,
							footer: { text: `${oPlayer.username} wins!` }
						}));

						this.stat[message.guild.id].ttt[xPlayer.id].loss.x++;
						this.stat[message.guild.id].ttt[oPlayer.id].win.o++;
						this.stat[message.guild.id].ttt[xPlayer.id][oPlayer.id].loss.x++;
						this.stat[message.guild.id].ttt[oPlayer.id][xPlayer.id].win.o++;
					} else {
						// The game is a draw.
						message.edit(new Discord.MessageEmbed({ 
							title: this.toString(),
							description: TicTacToe.makeBoard(game, xPlayer, oPlayer),
							color: successColor,
							footer: { text: "The game is a draw!" }
						}));

						this.stat[message.guild.id].ttt[xPlayer.id].draw.x++;
						this.stat[message.guild.id].ttt[oPlayer.id].draw.o++;
						this.stat[message.guild.id].ttt[xPlayer.id][oPlayer.id].draw.x++;
						this.stat[message.guild.id].ttt[oPlayer.id][xPlayer.id].draw.o++;
					}
					this.endFunction();
					gameCollector.stop();
				} else {
					message.edit(new Discord.MessageEmbed({ 
						title: this.toString(),
						description: TicTacToe.makeBoard(game, xPlayer, oPlayer),
						color: pendingColor,
						footer: { text: `${turn === 1 ? xPlayer.username : oPlayer.username}'s turn.` }
					}));
				}
			}
		});
	}

	/**
	 * Checks for undefined stats and creates data if necessary.
	 */
	checkUndefined() {
		Duel.checkUndefined(this.stat, this.channel.guild, this.code, this.challenger, this.opponent,
			{ win: { x: 0, o: 0 }, draw: { x: 0, o: 0 }, loss: { x: 0, o: 0 } }
		);
	}

	/**
	 * Makes a leaderboard.
	 * @param {Discord.TextChannel} channel - The channel to send the leaderboard to.
	 * @param {{}} stat - The object containing game stats.
	 * @param {Discord.Guild} guild - The guild to list stats for.
	 * @param {Discord.User} user - (Optional) The user to list stats for.
	 */
	static sendLeaderboard(channel, stat, guild, user) {
		TicTacToe.checkUndefined(stat, guild, "ttt");
		let arr = Object.entries(stat[guild.id].ttt).sort((a, b) => {
			let ao = { win: a[1].win.x + a[1].win.o, draw: a[1].draw.x + a[1].draw.o, loss: a[1].loss.x + a[1].loss.o };
			let bo = { win: b[1].win.x + b[1].win.o, draw: b[1].draw.x + b[1].draw.o, loss: b[1].loss.x + b[1].loss.o };
			let x = (ao.win + 0.5 * ao.draw) / (ao.win + ao.draw + ao.loss);
			let y = (bo.win + 0.5 * bo.draw) / (bo.win + bo.draw + bo.loss);
			if (x < y) return 1;
			else if (x > y) return -1;
			else if (ao.win < bo.win) return 1;
			else if (ao.win > bo.win) return -1;
			return 0;
		});
		if (user !== undefined) {
			if (stat[guild.id].ttt[user.id] !== undefined) {
				let rank = 0;
				for (rank = 0; rank < arr.length; rank++) {
					if (arr[rank][0] == user.id) {
						rank++;
						break;
					}
				}
				let userID = stat[guild.id].ttt[user.id];
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
				let o = { win: userID.win.x + userID.win.o, draw: userID.draw.x + userID.draw.o, loss: userID.loss.x + userID.loss.o };
				let x = (o.win + 0.5 * o.draw) / (o.win + o.draw + o.loss);
				str += ` **${user.username}** (${x.toFixed(3)})\n-- **${o.win}** win${o.win === 1 ? "" : "s"} / **${o.draw}** tie${o.draw === 1 ? "" : "s"} / **${o.loss}** loss${o.loss === 1 ? "" : "es"}\n-- **${userID.win.x + userID.draw.x + userID.loss.x}** :x: / **${userID.win.o + userID.draw.o + userID.loss.o}** :o:`;

				let idArr = arr.map(x => x[0]).filter((x) => { return stat[guild.id].ttt[user.id][x] !== undefined });
				guild.members.fetch({ user: idArr }).then((users) => {
					for (var opp of Object.keys(userID)) {
						if (opp == "win" || opp == "draw" || opp == "loss") continue;
						str += `\n${user.username} - **${userID[opp].win.x + userID[opp].win.o}** / **${userID[opp].draw.x + userID[opp].draw.o}** / **${userID[opp].loss.x + userID[opp].loss.o}** - ${users.get(opp).user.username}`;
					}
					channel.send(new Discord.MessageEmbed({ 
						title: ":x: :o: :x: Tic-Tac-Toe",
						description: str,
						footer: { text: `Listing ${user.username}'s stats.` },
						color: defaultColor
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":x: :o: :x: Tic-Tac-Toe",
					description: `${user.toString()} hasn't played Tic-Tac-Toe yet.`,
					color: defaultColor
				}));
			}
		} else {
			if (arr.length !== 0) {
				let rank = 1;
				let idArr = arr.map(x => x[0]);
				guild.members.fetch({ user: idArr }).then((users) => {
					let o = { win: arr[0][1].win.x + arr[0][1].win.o, draw: arr[0][1].draw.x + arr[0][1].draw.o, loss: arr[0][1].loss.x + arr[0][1].loss.o };
					let str = `:first_place: **${users.get(arr[0][0]).user.username}** (${((o.win + 0.5 * o.draw) / (o.win + o.draw + o.loss)).toFixed(3)})\n-- **${o.win}** win${o.win === 1 ? "" : "s"} / **${o.draw}** tie${o.draw === 1 ? "" : "s"} / **${o.loss}** loss${o.loss === 1 ? "" : "es"}`;
					for (var i = 1; i < arr.length; i++) {
						let ao = { win: arr[i][1].win.x + arr[i][1].win.o, draw: arr[i][1].draw.x + arr[i][1].draw.o, loss: arr[i][1].loss.x + arr[i][1].loss.o };
						let bo = { win: arr[i - 1][1].win.x + arr[i - 1][1].win.o, draw: arr[i - 1][1].draw.x + arr[i - 1][1].draw.o, loss: arr[i - 1][1].loss.x + arr[i - 1][1].loss.o };		
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
						title: ":x: :o: :x: Tic-Tac-Toe",
						description: str,
						footer: { text: `Listing the top ${arr.length} player${arr.length === 1 ? "" : "s"} sorted by WDL ratio.` },
						color: defaultColor
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":x: :o: :x: Tic-Tac-Toe",
					description: "No players to list.",
					color: defaultColor
				}));
			}
		}
	}

	/**
	 * Draws the board from the given game data.
	 * @param {Number[]} game - The game data.
	 * @param {Discord.User} xPlayer
	 * @param {Discord.User} oPlayer
	 */
	static makeBoard(game, xPlayer, oPlayer) {
		return `\`\`\`elm\n${game[0] === 0 ? '1' : game[0] === 1 ? 'X' : 'O'} │ ${game[1] === 0 ? '2' : game[1] === 1 ? 'X' : 'O'} │ ${game[2] === 0 ? '3' : game[2] === 1 ? 'X' : 'O'}\n──┼───┼──    X - ${xPlayer.username}   \n${game[3] === 0 ? '4' : game[3] === 1 ? 'X' : 'O'} │ ${game[4] === 0 ? '5' : game[4] === 1 ? 'X' : 'O'} │ ${game[5] === 0 ? '6' : game[5] === 1 ? 'X' : 'O'}\n──┼───┼──    O - ${oPlayer.username}   \n${game[6] === 0 ? '7' : game[6] === 1 ? 'X' : 'O'} │ ${game[7] === 0 ? '8' : game[7] === 1 ? 'X' : 'O'} │ ${game[8] === 0 ? '9' : game[8] === 1 ? 'X' : 'O'}\`\`\``;
	}

	/**
	 * Returns the index corresponding to an emoji.
	 * @param {Discord.Emoji} emoji - The emoji.
	 */
	static emojiToIndex(emoji) {
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
	static determineOutcome(game) {
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

}

/**
 * Models a game of Connect Four.
 */
class ConnectFour extends Duel {
	
	constructor(client, channel, stat, challenger, opponent) {
		super(client, channel, stat, "Connect Four", "c4", ":red_circle: :yellow_circle: :red_circle:", challenger, opponent);
	}

	/**
	 * Starts the game.
	 * @param {Discord.Message} message - The message to edit, or nothing if no message was made.
	 */
	play(message) {
		let players = [ this.challenger, this.opponent ];
		let game = [ [ 0, 0, 0, 0, 0, 0, 0 ],
					 [ 0, 0, 0, 0, 0, 0, 0 ],
					 [ 0, 0, 0, 0, 0, 0, 0 ],
					 [ 0, 0, 0, 0, 0, 0, 0 ],
					 [ 0, 0, 0, 0, 0, 0, 0 ],
					 [ 0, 0, 0, 0, 0, 0, 0 ] ];
		let turn = 1;
		const redPlayer = players.splice(Math.round(Math.random()), 1)[0];
		const yellowPlayer = players.pop();

		message.edit(new Discord.MessageEmbed({ 
			title: this.toString(),
			description: ConnectFour.makeBoard(game, redPlayer, yellowPlayer),
			footer: { text: `${redPlayer.username}'s turn.` },
			color: pendingColor
		}));
		message.react("1️⃣");
		message.react("2️⃣");
		message.react("3️⃣");
		message.react("4️⃣");
		message.react("5️⃣");
		message.react("6️⃣");
		message.react("7️⃣");
		
		// The ReactionCollector filter does not apply to removing reactions and was causing weird problems,
		// so I have decided not to use them and instead "filter" them from within the events.
		let gameCollector = message.createReactionCollector((reaction, user) => { return true; },
			{ dispose: true }
		).on("collect", (reaction, user) => {
			if (isPlayerTurn(reaction, user, turn)) playMove(this, reaction);
		}).on("remove", (reaction, user) => {
			if (isPlayerTurn(reaction, user, turn)) playMove(this, reaction);
		});

		function isPlayerTurn(reaction, user, turn) {
			return ((user.id === redPlayer.id && turn === 1) || (user.id === yellowPlayer.id && turn === 2)) && ConnectFour.emojiToIndex(reaction.emoji) !== -1;
		}
		function playMove(self, reaction) {
			let i = ConnectFour.emojiToIndex(reaction.emoji);
			let ri = -1;
			for (var r = 0; r < 6; r++) {
				if (game[r][i] === 0) {
					ri = r;
					break;
				}
			}
			if (ri !== -1) {
				game[ri][i] = turn;
				turn = turn % 2 + 1;
				let win = ConnectFour.determineOutcome(game, ri, i);
				if (win !== -1) {
					self.checkUndefined();
					if (win === 1) {
						// Red wins.
						message.edit(new Discord.MessageEmbed({ 
							title: self.toString(),
							description: ConnectFour.makeBoard(game, redPlayer, yellowPlayer),
							color: successColor,
							footer: { text: `${redPlayer.username} wins!` }
						}));
			
						self.stat[message.guild.id].c4[redPlayer.id].win.red++;
						self.stat[message.guild.id].c4[yellowPlayer.id].loss.yellow++;
						self.stat[message.guild.id].c4[redPlayer.id][yellowPlayer.id].win.red++;
						self.stat[message.guild.id].c4[yellowPlayer.id][redPlayer.id].loss.yellow++;
					} else if (win === 2) {
						// Yellow wins.
						message.edit(new Discord.MessageEmbed({ 
							title: self.toString(),
							description: ConnectFour.makeBoard(game, redPlayer, yellowPlayer),
							color: successColor,
							footer: { text: `${yellowPlayer.username} wins!` }
						}));

						self.stat[message.guild.id].c4[redPlayer.id].loss.red++;
						self.stat[message.guild.id].c4[yellowPlayer.id].win.yellow++;
						self.stat[message.guild.id].c4[redPlayer.id][yellowPlayer.id].loss.red++;
						self.stat[message.guild.id].c4[yellowPlayer.id][redPlayer.id].win.yellow++;
					} else {
						// The game is a draw.
						message.edit(new Discord.MessageEmbed({ 
							title: self.toString(),
							description: ConnectFour.makeBoard(game, redPlayer, yellowPlayer),
							color: successColor,
							footer: { text: "The game is a draw!" }
						}));

						self.stat[message.guild.id].c4[redPlayer.id].draw.red++;
						self.stat[message.guild.id].c4[yellowPlayer.id].draw.yellow++;
						self.stat[message.guild.id].c4[redPlayer.id][yellowPlayer.id].draw.red++;
						self.stat[message.guild.id].c4[yellowPlayer.id][redPlayer.id].draw.yellow++;
					}
					self.endFunction();
					gameCollector.stop();
				} else {
					message.edit(new Discord.MessageEmbed({ 
						title: self.toString(),
						description: ConnectFour.makeBoard(game, redPlayer, yellowPlayer),
						color: pendingColor,
						footer: { text: `${turn === 1 ? redPlayer.username : yellowPlayer.username}'s turn.` }
					}));
				}
			}
		}
	}

	/**
	 * Checks for undefined stats and creates data if necessary.
	 */
	checkUndefined() {
		Duel.checkUndefined(this.stat, this.channel.guild, this.code, this.challenger, this.opponent,
			{ win: { red: 0, yellow: 0 }, draw: { red: 0, yellow: 0 }, loss: { red: 0, yellow: 0 } }
		);
	}

	/**
	 * Makes a leaderboard.
	 * @param {Discord.TextChannel} channel - The channel to send the leaderboard to.
	 * @param {{}} stat - The object containing game stats.
	 * @param {Discord.Guild} guild - The guild to list stats for.
	 * @param {Discord.User} user - (Optional) The user to list stats for.
	 */
	static sendLeaderboard(channel, stat, guild, user) {
		ConnectFour.checkUndefined(stat, guild, "c4");
		let arr = Object.entries(stat[guild.id].c4).sort((a, b) => {
			let ao = { win: a[1].win.red + a[1].win.yellow, draw: a[1].draw.red + a[1].draw.yellow, loss: a[1].loss.red + a[1].loss.yellow };
			let bo = { win: b[1].win.red + b[1].win.yellow, draw: b[1].draw.red + b[1].draw.yellow, loss: b[1].loss.red + b[1].loss.yellow };
			let x = (ao.win + 0.5 * ao.draw) / (ao.win + ao.draw + ao.loss);
			let y = (bo.win + 0.5 * bo.draw) / (bo.win + bo.draw + bo.loss);
			if (x < y) return 1;
			else if (x > y) return -1;
			else if (ao.win < bo.win) return 1;
			else if (ao.win > bo.win) return -1;
			return 0;
		});
		if (user !== undefined) {
			if (stat[guild.id].c4[user.id] !== undefined) {
				let rank = 0;
				for (rank = 0; rank < arr.length; rank++) {
					if (arr[rank][0] == user.id) {
						rank++;
						break;
					}
				}
				let userID = stat[guild.id].c4[user.id];
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
				let o = { win: userID.win.red + userID.win.yellow, draw: userID.draw.red + userID.draw.yellow, loss: userID.loss.red + userID.loss.yellow };
				let x = (o.win + 0.5 * o.draw) / (o.win + o.draw + o.loss);
				str += ` **${user.username}** (${x.toFixed(3)})\n-- **${o.win}** win${o.win === 1 ? "" : "s"} / **${o.draw}** tie${o.draw === 1 ? "" : "s"} / **${o.loss}** loss${o.loss === 1 ? "" : "es"}\n-- **${userID.win.red + userID.draw.red + userID.loss.red}** :x: / **${userID.win.yellow + userID.draw.yellow + userID.loss.yellow}** :o:`;

				let idArr = arr.map(x => x[0]).filter((x) => { return stat[guild.id].c4[user.id][x] !== undefined });
				guild.members.fetch({ user: idArr }).then((users) => {
					for (var opp of Object.keys(userID)) {
						if (opp == "win" || opp == "draw" || opp == "loss") continue;
						str += `\n${user.username} - **${userID[opp].win.red + userID[opp].win.yellow}** / **${userID[opp].draw.red + userID[opp].draw.yellow}** / **${userID[opp].loss.red + userID[opp].loss.yellow}** - ${users.get(opp).user.username}`;
					}
					channel.send(new Discord.MessageEmbed({ 
						title: ":red_circle: :yellow_circle: :red_circle: Connect Four",
						description: str,
						footer: { text: `Listing ${user.username}'s stats.` },
						color: defaultColor
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":red_circle: :yellow_circle: :red_circle: Connect Four",
					description: `${user.toString()} hasn't played Connect Four yet.`,
					color: defaultColor
				}));
			}
		} else {
			if (arr.length !== 0) {
				let rank = 1;
				let idArr = arr.map(x => x[0]);
				guild.members.fetch({ user: idArr }).then((users) => {
					let o = { win: arr[0][1].win.red + arr[0][1].win.yellow, draw: arr[0][1].draw.red + arr[0][1].draw.yellow, loss: arr[0][1].loss.red + arr[0][1].loss.yellow };
					let str = `:first_place: **${users.get(arr[0][0]).user.username}** (${((o.win + 0.5 * o.draw) / (o.win + o.draw + o.loss)).toFixed(3)})\n-- **${o.win}** win${o.win === 1 ? "" : "s"} / **${o.draw}** tie${o.draw === 1 ? "" : "s"} / **${o.loss}** loss${o.loss === 1 ? "" : "es"}`;
					for (var i = 1; i < arr.length; i++) {
						let ao = { win: arr[i][1].win.red + arr[i][1].win.yellow, draw: arr[i][1].draw.red + arr[i][1].draw.yellow, loss: arr[i][1].loss.red + arr[i][1].loss.yellow };
						let bo = { win: arr[i - 1][1].win.red + arr[i - 1][1].win.yellow, draw: arr[i - 1][1].draw.red + arr[i - 1][1].draw.yellow, loss: arr[i - 1][1].loss.red + arr[i - 1][1].loss.yellow };		
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
						title: ":red_circle: :yellow_circle: :red_circle: Connect Four",
						description: str,
						footer: { text: `Listing the top ${arr.length} player${arr.length === 1 ? "" : "s"} sorted by WDL ratio.` },
						color: defaultColor
					}));
				});
			} else {
				channel.send(new Discord.MessageEmbed({ 
					title: ":red_circle: :yellow_circle: :red_circle: Connect Four",
					description: "No players to list.",
					color: defaultColor
				}));
			}
		}
	}

	/**
	 * Draws the board from the given game data.
	 * @param {Number[]} game - The game data.
	 * @param {Discord.User} redPlayer
	 * @param {Discord.User} yellowPlayer
	 */
	static makeBoard(game, redPlayer, yellowPlayer) {
		let str = `${redPlayer.toString()} :red_circle: vs. :yellow_circle: ${yellowPlayer.toString()}\n`;
		for (var r = 5; r >= 0; r--) {
			str += `\n${game[r][0] === 1 ? ":red_circle:" : game[r][0] === 2 ? ":yellow_circle:" : ":black_circle:"}`;
			for (var c = 1; c < 7; c++) {
				str += ` ${game[r][c] === 1 ? ":red_circle:" : game[r][c] === 2 ? ":yellow_circle:" : ":black_circle:"}`;
			}
		}
		return str;
	}

	/**
	 * Returns the index corresponding to an emoji.
	 * @param {Discord.Emoji} emoji - The emoji.
	 */
	static emojiToIndex(emoji) {
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
			default:
				return -1;
		}
	}

	/**
	 * Checks if the game has a winner.
	 * @param {Number[][]} game - The game data.
	 * @param {Number} r - The index of the row played.
	 * @param {Number} c - The index of the column played.
	 */
	static determineOutcome(game, r, c) {
		let v = game[r][c];
		if ((          r <= 2                     && game[r + 1][c] === v     && game[r + 2][c] === v     && game[r + 3][c] === v) ||     // Vertical 1 (Up)
			(r >= 1 && r <= 3                     && game[r + 1][c] === v     && game[r + 2][c] === v     && game[r - 1][c] === v) ||     // Vertical 2
			(r >= 2 && r <= 4                     && game[r + 1][c] === v     && game[r - 2][c] === v     && game[r - 1][c] === v) ||     // Vertical 3
			(r >= 3                               && game[r - 3][c] === v     && game[r - 2][c] === v     && game[r - 1][c] === v) ||     // Vertical 4 (Down)
			(                              c <= 3 && game[r][c + 1] === v     && game[r][c + 2] === v     && game[r][c + 3] === v) ||     // Horizontal 1 (Right)
			(                    c >= 1 && c <= 4 && game[r][c + 1] === v     && game[r][c + 2] === v     && game[r][c - 1] === v) ||     // Horizontal 2
			(                    c >= 2 && c <= 5 && game[r][c + 1] === v     && game[r][c - 2] === v     && game[r][c - 1] === v) ||     // Horizontal 3
			(                    c >= 3           && game[r][c - 3] === v     && game[r][c - 2] === v     && game[r][c - 1] === v) ||     // Horizontal 4 (Left)
			(          r <= 2           && c <= 3 && game[r + 1][c + 1] === v && game[r + 2][c + 2] === v && game[r + 3][c + 3] === v) || // ⟋ 1 (Up-Right)
			(r >= 1 && r <= 3 && c >= 1 && c <= 4 && game[r + 1][c + 1] === v && game[r + 2][c + 2] === v && game[r - 1][c - 1] === v) || // ⟋ 2
			(r >= 2 && r <= 4 && c >= 2 && c <= 5 && game[r + 1][c + 1] === v && game[r - 2][c - 2] === v && game[r - 1][c - 1] === v) || // ⟋ 3
			(r >= 3           && c >= 3           && game[r - 3][c - 3] === v && game[r - 2][c - 2] === v && game[r - 1][c - 1] === v) || // ⟋ 4 (Down-Left)
			(r >= 3                     && c <= 3 && game[r - 1][c + 1] === v && game[r - 2][c + 2] === v && game[r - 3][c + 3] === v) || // ⟍ 1 (Down-Right)
			(r >= 2 && r <= 4 && c >= 1 && c <= 4 && game[r - 1][c + 1] === v && game[r - 2][c + 2] === v && game[r + 1][c - 1] === v) || // ⟍ 2
			(r >= 1 && r <= 3 && c >= 2 && c <= 5 && game[r - 1][c + 1] === v && game[r + 2][c - 2] === v && game[r + 1][c - 1] === v) || // ⟍ 3
			(          r <= 2 && c >= 3           && game[r + 3][c - 3] === v && game[r + 2][c - 2] === v && game[r + 1][c - 1] === v))   // ⟍ 4 (Up-Left)
			return game[r][c];

		if (game[5].indexOf(0) === -1) return 0; // The game is a draw.
		return -1; // The game is still in progress.
	}

}

module.exports = {
	RockPaperScissors: RockPaperScissors,
	TicTacToe: TicTacToe,
	ConnectFour: ConnectFour
}

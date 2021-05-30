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
	 * @param {String} title - The name of the game.
	 * @param {String} code - The shorthand name of the game.
	 * @param {String} prefix - The game title's prefix.
	 * @param {} defaultStat - The default value for stats.
	 * @param {{}} stat - The object containing game stats.
	 */
	constructor(client, channel, title, code, prefix, defaultStat, stat = {}) {
		if (new.target === Game) throw new TypeError("Cannot create instance of an abstract game.");
		this.client = client;
		this.channel = channel;
		this.title = title;
		this.code = code;
		this.prefix = prefix;
		this.defaultStat = defaultStat;
		this.stat = stat;
		this.endFunction = () => {};
	}

	onEnd(fn) {
		this.endFunction = fn;
	}

	toString() {
		return `${this.prefix} ${this.title}`;
	}

	/**
	 * Checks for undefined stats and creates data if necessary.
	 * @param {Discord.User} user - The user being faced against.
	 */
	checkUndefined(user) {
		if (this.stat[this.channel.guild.id] === undefined) this.stat[this.channel.guild.id] = {};
		if (this.stat[this.channel.guild.id][this.code] === undefined) this.stat[this.channel.guild.id][this.code] = {};
		if (user && this.stat[this.channel.guild.id][this.code][user.id] === undefined) this.stat[this.channel.guild.id][this.code][user.id] = JSON.parse(JSON.stringify(this.defaultStat));
	}

}

/**
 * Models an abstract two-player game.
 */
class Duel extends Game {
	
	/**
	 * @param {Discord.Client} client - The client.
	 * @param {Discord.TextChannel} channel - The channel where the game is created.
	 * @param {String} title - The name of the game.
	 * @param {String} code - The shorthand name of the game.
	 * @param {String} prefix - The game title's prefix.
	 * @param {Discord.User} challenger - The user initiating the duel.
	 * @param {Discord.User} opponent - The user being faced against.
	 * @param {Boolean} allowBotOpponent - Whether or not a user can challenge the bot.
	 * @param {} defaultStat - The default value for stats.
	 * @param {{}} stat - The object containing game stats.
	 */
	constructor(client, channel, title, code, prefix, challenger, opponent, allowBotOpponent, defaultStat, stat) {
		if (new.target === Duel) throw new TypeError("Cannot create instance of an abstract duel.");
		super(client, channel, title, code, prefix, defaultStat, stat);
		this.challenger = challenger;
		this.opponent = opponent;
		this.allowBotOpponent = allowBotOpponent;

		// Required methods
		if (this.play === undefined) throw new Error(`${new.target.name} is missing the 'play' method.`);
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
						this.message = message;
						this.play();
	
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
	 */
	checkUndefined() {
		if (this.stat[this.channel.guild.id] === undefined) this.stat[this.channel.guild.id] = {};
		if (this.stat[this.channel.guild.id][this.code] === undefined) this.stat[this.channel.guild.id][this.code] = {};
		if (this.challenger !== undefined) if (this.stat[this.channel.guild.id][this.code][this.challenger.id] === undefined) this.stat[this.channel.guild.id][this.code][this.challenger.id] = JSON.parse(JSON.stringify(this.defaultStat));
		if (this.opponent !== undefined) if (this.stat[this.channel.guild.id][this.code][this.opponent.id] === undefined) this.stat[this.channel.guild.id][this.code][this.opponent.id] = JSON.parse(JSON.stringify(this.defaultStat));
		if (this.challenger !== undefined && this.opponent !== undefined) {
			if (this.stat[this.channel.guild.id][this.code][this.challenger.id][this.opponent.id] === undefined) this.stat[this.channel.guild.id][this.code][this.challenger.id][this.opponent.id] = JSON.parse(JSON.stringify(this.defaultStat));
			if (this.stat[this.channel.guild.id][this.code][this.opponent.id][this.challenger.id] === undefined) this.stat[this.channel.guild.id][this.code][this.opponent.id][this.challenger.id] = JSON.parse(JSON.stringify(this.defaultStat));
		}
	}

}

/**
 * Models an abstract game for more than two players.
 */
class Group extends Game {

	/**
	 * @param {Discord.Client} client - The client.
	 * @param {Discord.TextChannel} channel - The channel where the game is created.
	 * @param {String} title - The name of the game.
	 * @param {String} code - The shorthand name of the game.
	 * @param {String} prefix - The game title's prefix.
	 * @param {Discord.User} host - The user hosting the game.
	 * @param {Number} maxPlayers - The maximum number of users who can play the game.
	 * @param {Boolean} allowBotOpponent - Whether or not a user can challenge the bot.
	 * @param {} defaultStat - The default value for stats.
	 * @param {{}} stat - The object containing game stats.
	 */
	constructor(client, channel, title, code, prefix, host, maxPlayers, allowBotOpponent, defaultStat, stat) {
		if (new.target === Group) throw new TypeError("Cannot create instance of an abstract group game.");
		super(client, channel, title, code, prefix, stat);
		this.host = host;
		this.maxPlayers = maxPlayers;
		this.players = [ host ];
		this.allowBotOpponent = allowBotOpponent;

		// Required methods
		if (this.play === undefined) throw new Error(`${new.target.name} is missing the 'play(message)' method.`);
	}

	/**
	 * Hosts a game.
	 */
	hostLobby() {
		if (this.host.bot) {
			this.channel.send(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `:no_entry_sign: Bots can't host games!`,
				color: failColor
			})).then((message) => { setTimeout(() => { message.delete(); }, badMessageTimeout); });
		} else {
			let e = new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `:game_die: ${this.host.toString()} is hosting a game of ${this.title}!\n\n${this.makePlayerList()}`,
				footer: { text: `${this.players.length} / ${this.maxPlayers} players` },
				color: defaultColor
			});
			this.channel.send(e).then((message) => {
				message.react("⏫");
				message.react("✅");
				message.react("🚫");
				let collector = message.createReactionCollector((reaction, user) => 
					(user.id !== this.host.id && !user.bot && reaction.emoji.name === "⏫") ||
					(user.id === this.host.id && (reaction.emoji.name === "✅" || reaction.emoji.name === "🚫")),
					{ dispose: true }
				).on("collect", (reaction, user) => {
					if (reaction.emoji.name === "⏫") {
	
						// User joined
						if (this.players.length < this.maxPlayers) this.players.push(user);
						e.setDescription(`:game_die: ${this.host.toString()} is hosting a game of ${this.title}!\n\n${this.makePlayerList()}`);
						e.setFooter(`${this.players.length} / ${this.maxPlayers} players`);
						message.edit(e);
	
					} else if (reaction.emoji.name === "✅") {
	
						// Start game
						collector.stop();
						message.reactions.removeAll();
						this.play(message);
	
					} else {
	
						// Cancel game
						collector.stop();
						message.delete();
	
					}
				}).on("remove", (reaction, user) => {
					if (reaction.emoji.name === "⏫") {

						// User left
						this.players = this.players.filter((player) => { return player.id !== user.id; });
						e.setDescription(`:game_die: ${this.host.toString()} is hosting a game of ${this.title}!\n\n${this.makePlayerList()}`);
						e.setFooter(`${this.players.length} / ${this.maxPlayers} players`);
						message.edit(e);

					}
				});
			});
		}
	}

	/**
	 * Returns a numbered list of players.
	 */
	makePlayerList() {
		let str = `**1.** ${this.players[0].toString()}`;
		let i = 1;
		for (; i < this.players.length; i++) {
			str += `\n**${i + 1}.** ${this.players[i].toString()}`;
		}
		for (; i < this.maxPlayers; i++) {
			str += `\n**${i + 1}.** ---`;
		}
		return str;
	}

}

/**
 * Models a game of Rock Paper Scissors.
 */
class RockPaperScissors extends Duel {

	constructor(client, channel, challenger, opponent, stat) {
		super(client, channel, "Rock Paper Scissors", "rps", ":rock: :page_facing_up: :scissors:", challenger, opponent, true,
		{ win: { rock: 0, paper: 0, scissors: 0 }, draw: { rock: 0, paper: 0, scissors: 0 }, loss: { rock: 0, paper: 0, scissors: 0 } }, stat);
	}

	/**
	 * Starts the game.
	 */
	play() {
		if (this.opponent.id === this.client.user.id) {
			this.channel.send(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `What will you use against ${this.opponent.username}, ${this.challenger.toString()}?`,
				footer: { text: "Choose an item." },
				color: defaultColor
			})).then((message) => {
				this.message = message;
				message.react("🪨");
				message.react("📄");
				message.react("✂️");
	
				let collector = message.createReactionCollector((reaction, user) => 
					user.id === this.challenger.id && (reaction.emoji.name === "🪨" || reaction.emoji.name === "📄" || reaction.emoji.name === "✂️")
				).once("collect", (reaction) => {
					this.game = { challenger: null, opponent: Math.floor(Math.random() * 3) };
					if (reaction.emoji.name === "🪨") {
						this.game.challenger = 0;
					} else if (reaction.emoji.name === "📄") {
						this.game.challenger = 1;
					} else {
						this.game.challenger = 2;
					}
					message.reactions.removeAll();
					this.endGame();
					collector.stop();
				});
			});
		} else {
			this.message.edit(new Discord.MessageEmbed({ 
				title: this.toString(),
				description: `:crossed_swords: ${this.opponent.toString()} accepted ${this.challenger.toString()}'s challenge!`,
				footer: { text: "Waiting for both players..." },
				color: pendingColor
			}));
	
			this.game = { challenger: null, opponent: null };
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
							this.game.challenger = 0;
						} else if (reaction.emoji.name === "📄") {
							newEmbed.setDescription(":page_facing_up: You picked Paper.");
							this.game.challenger = 1;
						} else {
							newEmbed.setDescription(":scissors: You picked Scissors.");
							this.game.challenger = 2;
						}
						if (this.game.opponent !== null) {
	
							// Game finished
							this.endGame(pmc, pmo);
	
						} else {
	
							// Waiting for opponent
							pmc.edit(newEmbed);
							this.message.edit(new Discord.MessageEmbed({ 
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
							this.game.opponent = 0;
						} else if (reaction.emoji.name === "📄") {
							newEmbed.setDescription(":page_facing_up: You picked Paper.");
							this.game.opponent = 1;
						} else {
							newEmbed.setDescription(":scissors: You picked Scissors.");
							this.game.opponent = 2;
						}
						if (this.game.challenger !== null) {
							
							// Game finished
							this.endGame(pmc, pmo);
	
						} else {
	
							// Waiting for opponent
							pmo.edit(newEmbed);
							this.message.edit(new Discord.MessageEmbed({ 
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
	 * Updates the stats and embedded messages to show the outcome.
	 * @param {Discord.Message} pmc - The challenger's private message.
	 * @param {Discord.Message} pmo - The opponent's private message.
	 */
	endGame(pmc, pmo) {
		this.checkUndefined();
		if (this.game.challenger === this.game.opponent) {

			// Tie
			this.message.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: successColor,
				footer: { text: "The game is a draw!" }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: drawColor,
				footer: { text: "The game is a draw!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: drawColor,
				footer: { text: "The game is a draw!" }
			}));

			this.stat[this.message.guild.id][this.code][this.challenger.id].draw[RockPaperScissors.optionToKey(this.game.challenger)]++;
			this.stat[this.message.guild.id][this.code][this.opponent.id].draw[RockPaperScissors.optionToKey(this.game.opponent)]++;
			this.stat[this.message.guild.id][this.code][this.challenger.id][this.opponent.id].draw[RockPaperScissors.optionToKey(this.game.challenger)]++;
			this.stat[this.message.guild.id][this.code][this.opponent.id][this.challenger.id].draw[RockPaperScissors.optionToKey(this.game.opponent)]++;

		} else if (this.game.challenger === (this.game.opponent + 1) % 3) {

			// Challenger wins
			this.message.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: successColor,
				footer: { text: `${this.challenger.username} wins!` }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: winColor,
				footer: { text: "You won!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: lossColor,
				footer: { text: "You lost!" }
			}));

			this.stat[this.message.guild.id][this.code][this.challenger.id].win[RockPaperScissors.optionToKey(this.game.challenger)]++;
			this.stat[this.message.guild.id][this.code][this.opponent.id].loss[RockPaperScissors.optionToKey(this.game.opponent)]++;
			this.stat[this.message.guild.id][this.code][this.challenger.id][this.opponent.id].win[RockPaperScissors.optionToKey(this.game.challenger)]++;
			this.stat[this.message.guild.id][this.code][this.opponent.id][this.challenger.id].loss[RockPaperScissors.optionToKey(this.game.opponent)]++;

		} else {

			// Opponent wins
			this.message.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: successColor,
				footer: { text: `${this.opponent.username} wins!` }
			}));
			if (pmc !== undefined) pmc.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: lossColor,
				footer: { text: "You lost!" }
			}));
			if (pmo !== undefined) pmo.edit(new Discord.MessageEmbed({
				title: this.toString(),
				description: `${this.challenger.toString()} ${RockPaperScissors.optionToEmoji(this.game.challenger)} vs. ${RockPaperScissors.optionToEmoji(this.game.opponent)} ${this.opponent.toString()}`,
				color: winColor,
				footer: { text: "You won!" }
			}));

			this.stat[this.message.guild.id][this.code][this.challenger.id].loss[RockPaperScissors.optionToKey(this.game.challenger)]++;
			this.stat[this.message.guild.id][this.code][this.opponent.id].win[RockPaperScissors.optionToKey(this.game.opponent)]++;
			this.stat[this.message.guild.id][this.code][this.challenger.id][this.opponent.id].loss[RockPaperScissors.optionToKey(this.game.challenger)]++;
			this.stat[this.message.guild.id][this.code][this.opponent.id][this.challenger.id].win[RockPaperScissors.optionToKey(this.game.opponent)]++;

		}
		this.endFunction();
	}

	/**
	 * Makes a leaderboard.
	 */
	sendLeaderboard() {
		this.checkUndefined();
		let arr = Object.entries(this.stat[this.channel.guild.id].rps).sort((a, b) => {
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
		if (arr.length !== 0) {
			let rank = 1;
			let idArr = arr.map(x => x[0]);
			this.channel.guild.members.fetch({ user: idArr }).then((users) => {
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
				this.channel.send(new Discord.MessageEmbed({ 
					title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
					description: str,
					footer: { text: `Listing the top ${arr.length} player${arr.length === 1 ? "" : "s"} sorted by WDL ratio.` },
					color: defaultColor
				}));
			});
		} else {
			this.channel.send(new Discord.MessageEmbed({ 
				title: ":rock: :page_facing_up: :scissors: Rock Paper Scissors",
				description: "No players to list.",
				color: defaultColor
			}));
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

	constructor(client, channel, challenger, opponent, stat) {
		super(client, channel, "Tic-Tac-Toe", "ttt", ":x: :o: :x:", challenger, opponent, false,
		{ win: { x: 0, o: 0 }, draw: { x: 0, o: 0 }, loss: { x: 0, o: 0 } }, stat);

		let players = [ this.challenger, this.opponent ];
		this.xPlayer = players.splice(Math.round(Math.random()), 1)[0];
		this.oPlayer = players.pop();
		this.turn = 1;
		this.board = [ 0, 0, 0, 0, 0, 0, 0, 0, 0 ];
	}

	/**
	 * Starts the game.
	 */
	play() {
		this.message.edit(new Discord.MessageEmbed({ 
			title: this.toString(),
			description: this.makeBoard(),
			footer: { text: `${this.xPlayer.username}'s turn.` },
			color: pendingColor
		}));
		this.message.react("1️⃣");
		this.message.react("2️⃣");
		this.message.react("3️⃣");
		this.message.react("4️⃣");
		this.message.react("5️⃣");
		this.message.react("6️⃣");
		this.message.react("7️⃣");
		this.message.react("8️⃣");
		this.message.react("9️⃣");
		
		let gameCollector = this.message.createReactionCollector((reaction, user) => 
			((user.id === this.xPlayer.id && this.turn === 1) || (user.id === this.oPlayer.id && this.turn === 2)) && TicTacToe.emojiToIndex(reaction.emoji) !== -1
		).on("collect", (reaction, user) => {
			let i = TicTacToe.emojiToIndex(reaction.emoji);
			if (this.board[i] === 0) {
				this.board[i] = this.turn;
				this.turn = this.turn % 2 + 1;
				let win = this.determineOutcome();
				if (win !== -1) {
					this.checkUndefined();
					if (win === 1) {
						// X wins.
						this.message.edit(new Discord.MessageEmbed({ 
							title: this.toString(),
							description: this.makeBoard(),
							color: successColor,
							footer: { text: `${this.xPlayer.username} wins!` }
						}));
			
						this.stat[this.message.guild.id].ttt[this.xPlayer.id].win.x++;
						this.stat[this.message.guild.id].ttt[this.oPlayer.id].loss.o++;
						this.stat[this.message.guild.id].ttt[this.xPlayer.id][this.oPlayer.id].win.x++;
						this.stat[this.message.guild.id].ttt[this.oPlayer.id][this.xPlayer.id].loss.o++;
					} else if (win === 2) {
						// O wins.
						this.message.edit(new Discord.MessageEmbed({ 
							title: this.toString(),
							description: this.makeBoard(),
							color: successColor,
							footer: { text: `${this.oPlayer.username} wins!` }
						}));

						this.stat[this.message.guild.id].ttt[this.xPlayer.id].loss.x++;
						this.stat[this.message.guild.id].ttt[this.oPlayer.id].win.o++;
						this.stat[this.message.guild.id].ttt[this.xPlayer.id][this.oPlayer.id].loss.x++;
						this.stat[this.message.guild.id].ttt[this.oPlayer.id][this.xPlayer.id].win.o++;
					} else {
						// The game is a draw.
						this.message.edit(new Discord.MessageEmbed({ 
							title: this.toString(),
							description: this.makeBoard(),
							color: successColor,
							footer: { text: "The game is a draw!" }
						}));

						this.stat[this.message.guild.id].ttt[this.xPlayer.id].draw.x++;
						this.stat[this.message.guild.id].ttt[this.oPlayer.id].draw.o++;
						this.stat[this.message.guild.id].ttt[this.xPlayer.id][this.oPlayer.id].draw.x++;
						this.stat[this.message.guild.id].ttt[this.oPlayer.id][this.xPlayer.id].draw.o++;
					}
					this.endFunction();
					gameCollector.stop();
				} else {
					this.message.edit(new Discord.MessageEmbed({ 
						title: this.toString(),
						description: this.makeBoard(),
						color: pendingColor,
						footer: { text: `${this.turn === 1 ? this.xPlayer.username : this.oPlayer.username}'s turn.` }
					}));
				}
			}
		});
	}

	/**
	 * Makes a leaderboard.
	 */
	sendLeaderboard() {
		this.checkUndefined();
		let arr = Object.entries(this.stat[this.channel.guild.id].ttt).sort((a, b) => {
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
		if (arr.length !== 0) {
			let rank = 1;
			let idArr = arr.map(x => x[0]);
			this.channel.guild.members.fetch({ user: idArr }).then((users) => {
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
				this.channel.send(new Discord.MessageEmbed({ 
					title: ":x: :o: :x: Tic-Tac-Toe",
					description: str,
					footer: { text: `Listing the top ${arr.length} player${arr.length === 1 ? "" : "s"} sorted by WDL ratio.` },
					color: defaultColor
				}));
			});
		} else {
			this.channel.send(new Discord.MessageEmbed({ 
				title: ":x: :o: :x: Tic-Tac-Toe",
				description: "No players to list.",
				color: defaultColor
			}));
		}
	}

	/**
	 * Draws the board.
	 */
	makeBoard() {
		return `\`\`\`elm\n${this.board[0] === 0 ? '1' : this.board[0] === 1 ? 'X' : 'O'} │ ${this.board[1] === 0 ? '2' : this.board[1] === 1 ? 'X' : 'O'} │ ${this.board[2] === 0 ? '3' : this.board[2] === 1 ? 'X' : 'O'}\n──┼───┼──    X - ${this.xPlayer.username}   \n${this.board[3] === 0 ? '4' : this.board[3] === 1 ? 'X' : 'O'} │ ${this.board[4] === 0 ? '5' : this.board[4] === 1 ? 'X' : 'O'} │ ${this.board[5] === 0 ? '6' : this.board[5] === 1 ? 'X' : 'O'}\n──┼───┼──    O - ${this.oPlayer.username}   \n${this.board[6] === 0 ? '7' : this.board[6] === 1 ? 'X' : 'O'} │ ${this.board[7] === 0 ? '8' : this.board[7] === 1 ? 'X' : 'O'} │ ${this.board[8] === 0 ? '9' : this.board[8] === 1 ? 'X' : 'O'}\`\`\``;
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
	 */
	determineOutcome() {
		if ((this.board[0] !== 0 && this.board[0] === this.board[1] && this.board[1] === this.board[2])) return this.board[0]; // Top Row
		if ((this.board[3] !== 0 && this.board[3] === this.board[4] && this.board[4] === this.board[5])) return this.board[3]; // Middle Row
		if ((this.board[6] !== 0 && this.board[6] === this.board[7] && this.board[7] === this.board[8])) return this.board[6]; // Bottom Row
		if ((this.board[0] !== 0 && this.board[0] === this.board[3] && this.board[3] === this.board[6])) return this.board[0]; // Left Column
		if ((this.board[1] !== 0 && this.board[1] === this.board[4] && this.board[4] === this.board[7])) return this.board[1]; // Middle Column
		if ((this.board[2] !== 0 && this.board[2] === this.board[5] && this.board[5] === this.board[8])) return this.board[2]; // Right Column
		if ((this.board[0] !== 0 && this.board[0] === this.board[4] && this.board[4] === this.board[8])) return this.board[0]; // Down-Right
		if ((this.board[2] !== 0 && this.board[2] === this.board[4] && this.board[4] === this.board[6])) return this.board[2]; // Down-Left

		if (this.board.indexOf(0) === -1) return 0; // The game is a draw.
		return -1; // The game is still in progress.
	}

}

/**
 * Models a game of Connect Four.
 */
class ConnectFour extends Duel {
	
	constructor(client, channel, challenger, opponent, stat) {
		super(client, channel, "Connect Four", "c4", ":red_circle: :yellow_circle: :red_circle:", challenger, opponent, false,
		{ win: { red: 0, yellow: 0 }, draw: { red: 0, yellow: 0 }, loss: { red: 0, yellow: 0 } }, stat);

		let players = [ this.challenger, this.opponent ];
		this.redPlayer = players.splice(Math.round(Math.random()), 1)[0];
		this.yellowPlayer = players.pop();
		this.turn = 1;
		this.board = [
			[ 0, 0, 0, 0, 0, 0, 0 ],
			[ 0, 0, 0, 0, 0, 0, 0 ],
			[ 0, 0, 0, 0, 0, 0, 0 ],
			[ 0, 0, 0, 0, 0, 0, 0 ],
			[ 0, 0, 0, 0, 0, 0, 0 ],
			[ 0, 0, 0, 0, 0, 0, 0 ]
		];
	}

	/**
	 * Starts the game.
	 */
	play() {
		this.message.edit(new Discord.MessageEmbed({ 
			title: this.toString(),
			description: this.makeBoard(),
			footer: { text: `${this.redPlayer.username}'s turn.` },
			color: pendingColor
		}));
		this.message.react("1️⃣");
		this.message.react("2️⃣");
		this.message.react("3️⃣");
		this.message.react("4️⃣");
		this.message.react("5️⃣");
		this.message.react("6️⃣");
		this.message.react("7️⃣");
		
		// The ReactionCollector filter does not apply to removing reactions and was causing weird problems,
		// so I have decided not to use them and instead "filter" them from within the events.
		this.reactionCollector = this.message.createReactionCollector((reaction, user) => { return true; },
			{ dispose: true }
		).on("collect", (reaction, user) => {
			if (this.isPlayerTurn(reaction, user)) this.playColumn(ConnectFour.emojiToIndex(reaction.emoji));
		}).on("remove", (reaction, user) => {
			if (this.isPlayerTurn(reaction, user)) this.playColumn(ConnectFour.emojiToIndex(reaction.emoji));
		});
	}

	playColumn(column) {
		let ri = -1;
		for (var r = 0; r < 6; r++) {
			if (this.board[r][column] === 0) {
				ri = r;
				break;
			}
		}
		if (ri !== -1) {
			this.board[ri][column] = this.turn;
			this.turn = this.turn % 2 + 1;
			let win = this.determineOutcome(ri, column);
			if (win !== -1) {
				this.checkUndefined();
				if (win === 1) {
					// Red wins.
					this.message.edit(new Discord.MessageEmbed({ 
						title: this.toString(),
						description: this.makeBoard(),
						color: successColor,
						footer: { text: `${this.redPlayer.username} wins!` }
					}));
		
					this.stat[this.message.guild.id].c4[this.redPlayer.id].win.red++;
					this.stat[this.message.guild.id].c4[this.yellowPlayer.id].loss.yellow++;
					this.stat[this.message.guild.id].c4[this.redPlayer.id][this.yellowPlayer.id].win.red++;
					this.stat[this.message.guild.id].c4[this.yellowPlayer.id][this.redPlayer.id].loss.yellow++;
				} else if (win === 2) {
					// Yellow wins.
					this.message.edit(new Discord.MessageEmbed({ 
						title: this.toString(),
						description: this.makeBoard(),
						color: successColor,
						footer: { text: `${this.yellowPlayer.username} wins!` }
					}));

					this.stat[this.message.guild.id].c4[this.redPlayer.id].loss.red++;
					this.stat[this.message.guild.id].c4[this.yellowPlayer.id].win.yellow++;
					this.stat[this.message.guild.id].c4[this.redPlayer.id][this.yellowPlayer.id].loss.red++;
					this.stat[this.message.guild.id].c4[this.yellowPlayer.id][this.redPlayer.id].win.yellow++;
				} else {
					// The game is a draw.
					this.message.edit(new Discord.MessageEmbed({ 
						title: this.toString(),
						description: this.makeBoard(),
						color: successColor,
						footer: { text: "The game is a draw!" }
					}));

					this.stat[this.message.guild.id].c4[this.redPlayer.id].draw.red++;
					this.stat[this.message.guild.id].c4[this.yellowPlayer.id].draw.yellow++;
					this.stat[this.message.guild.id].c4[this.redPlayer.id][this.yellowPlayer.id].draw.red++;
					this.stat[this.message.guild.id].c4[this.yellowPlayer.id][this.redPlayer.id].draw.yellow++;
				}
				this.endFunction();
				this.reactionCollector.stop();
			} else {
				this.message.edit(new Discord.MessageEmbed({ 
					title: this.toString(),
					description: this.makeBoard(),
					color: pendingColor,
					footer: { text: `${this.turn === 1 ? this.redPlayer.username : this.yellowPlayer.username}'s turn.` }
				}));
			}
		}
	}

	isPlayerTurn(reaction, user) {
		return ((user.id === this.redPlayer.id && this.turn === 1) || (user.id === this.yellowPlayer.id && this.turn === 2)) && ConnectFour.emojiToIndex(reaction.emoji) !== -1;
	}

	/**
	 * Makes a leaderboard.
	 */
	sendLeaderboard() {
		this.checkUndefined();
		let arr = Object.entries(this.stat[this.channel.guild.id].c4).sort((a, b) => {
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
		if (arr.length !== 0) {
			let rank = 1;
			let idArr = arr.map(x => x[0]);
			this.channel.guild.members.fetch({ user: idArr }).then((users) => {
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
				this.channel.send(new Discord.MessageEmbed({ 
					title: ":red_circle: :yellow_circle: :red_circle: Connect Four",
					description: str,
					footer: { text: `Listing the top ${arr.length} player${arr.length === 1 ? "" : "s"} sorted by WDL ratio.` },
					color: defaultColor
				}));
			});
		} else {
			this.channel.send(new Discord.MessageEmbed({ 
				title: ":red_circle: :yellow_circle: :red_circle: Connect Four",
				description: "No players to list.",
				color: defaultColor
			}));
		}
	}

	/**
	 * Draws the board.
	 */
	makeBoard() {
		let str = `${this.redPlayer.toString()} :red_circle: vs. :yellow_circle: ${this.yellowPlayer.toString()}\n`;
		for (var r = 5; r >= 0; r--) {
			str += `\n${this.board[r][0] === 1 ? ":red_circle:" : this.board[r][0] === 2 ? ":yellow_circle:" : ":black_circle:"}`;
			for (var c = 1; c < 7; c++) {
				str += ` ${this.board[r][c] === 1 ? ":red_circle:" : this.board[r][c] === 2 ? ":yellow_circle:" : ":black_circle:"}`;
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
	 * @param {Number} r - The index of the row played.
	 * @param {Number} c - The index of the column played.
	 */
	determineOutcome(r, c) {
		let v = this.board[r][c];
		if ((          r <= 2                     && this.board[r + 1][c] === v     && this.board[r + 2][c] === v     && this.board[r + 3][c] === v) ||     // Vertical 1 (Up)
			(r >= 1 && r <= 3                     && this.board[r + 1][c] === v     && this.board[r + 2][c] === v     && this.board[r - 1][c] === v) ||     // Vertical 2
			(r >= 2 && r <= 4                     && this.board[r + 1][c] === v     && this.board[r - 2][c] === v     && this.board[r - 1][c] === v) ||     // Vertical 3
			(r >= 3                               && this.board[r - 3][c] === v     && this.board[r - 2][c] === v     && this.board[r - 1][c] === v) ||     // Vertical 4 (Down)
			(                              c <= 3 && this.board[r][c + 1] === v     && this.board[r][c + 2] === v     && this.board[r][c + 3] === v) ||     // Horizontal 1 (Right)
			(                    c >= 1 && c <= 4 && this.board[r][c + 1] === v     && this.board[r][c + 2] === v     && this.board[r][c - 1] === v) ||     // Horizontal 2
			(                    c >= 2 && c <= 5 && this.board[r][c + 1] === v     && this.board[r][c - 2] === v     && this.board[r][c - 1] === v) ||     // Horizontal 3
			(                    c >= 3           && this.board[r][c - 3] === v     && this.board[r][c - 2] === v     && this.board[r][c - 1] === v) ||     // Horizontal 4 (Left)
			(          r <= 2           && c <= 3 && this.board[r + 1][c + 1] === v && this.board[r + 2][c + 2] === v && this.board[r + 3][c + 3] === v) || // ⟋ 1 (Up-Right)
			(r >= 1 && r <= 3 && c >= 1 && c <= 4 && this.board[r + 1][c + 1] === v && this.board[r + 2][c + 2] === v && this.board[r - 1][c - 1] === v) || // ⟋ 2
			(r >= 2 && r <= 4 && c >= 2 && c <= 5 && this.board[r + 1][c + 1] === v && this.board[r - 2][c - 2] === v && this.board[r - 1][c - 1] === v) || // ⟋ 3
			(r >= 3           && c >= 3           && this.board[r - 3][c - 3] === v && this.board[r - 2][c - 2] === v && this.board[r - 1][c - 1] === v) || // ⟋ 4 (Down-Left)
			(r >= 3                     && c <= 3 && this.board[r - 1][c + 1] === v && this.board[r - 2][c + 2] === v && this.board[r - 3][c + 3] === v) || // ⟍ 1 (Down-Right)
			(r >= 2 && r <= 4 && c >= 1 && c <= 4 && this.board[r - 1][c + 1] === v && this.board[r - 2][c + 2] === v && this.board[r + 1][c - 1] === v) || // ⟍ 2
			(r >= 1 && r <= 3 && c >= 2 && c <= 5 && this.board[r - 1][c + 1] === v && this.board[r + 2][c - 2] === v && this.board[r + 1][c - 1] === v) || // ⟍ 3
			(          r <= 2 && c >= 3           && this.board[r + 3][c - 3] === v && this.board[r + 2][c - 2] === v && this.board[r + 1][c - 1] === v))   // ⟍ 4 (Up-Left)
			return this.board[r][c];

		if (this.board[5].indexOf(0) === -1) return 0; // The game is a draw.
		return -1; // The game is still in progress.
	}

}

module.exports = {
	RockPaperScissors: RockPaperScissors,
	TicTacToe: TicTacToe,
	ConnectFour: ConnectFour
}

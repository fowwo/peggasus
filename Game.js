const Discord = require("discord.js");

const defaultColor = "#faa61a";
const failColor = "#ff0000";
const cancelledColor = "#606060";
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
		if (user1 !== undefined) if (stat[guild.id][code][user1.id] === undefined) stat[guild.id][code][user1.id] = defaultData;
		if (user2 !== undefined) if (stat[guild.id][code][user2.id] === undefined) stat[guild.id][code][user2.id] = defaultData;
		if (user1 !== undefined && user2 !== undefined) {
			if (stat[guild.id][code][user1.id][user2.id] === undefined) stat[guild.id][code][user1.id][user2.id] = defaultData;
			if (stat[guild.id][code][user2.id][user1.id] === undefined) stat[guild.id][code][user2.id][user1.id] = defaultData;
		}
	}

}


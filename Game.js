const Discord = require("discord.js");

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
	 */
	constructor(client, channel, title, code, prefix) {
		this.client = client;
		this.channel = channel;
		this.title = title;
		this.code = code;
		this.prefix = prefix;
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
	 * @param {String} title - The name of the game.
	 * @param {String} code - The shorthand name of the game.
	 * @param {String} prefix - The game title's prefix.
	 * @param {Discord.User} challenger - The user initiating the duel.
	 * @param {Discord.User} opponent - The user being faced against.
	 * @param {Boolean} allowBotOpponent - Whether or not a user can challenge the bot.
	 */
	constructor(client, channel, title, code, prefix, challenger, opponent, allowBotOpponent = false) {
		super(client, channel, title, code, prefix);
		this.challenger = challenger;
		this.opponent = opponent;
		this.allowBotOpponent = allowBotOpponent;
	}

}


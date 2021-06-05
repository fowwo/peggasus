const Discord = require("discord.js");

const defaultColor = "#faa61a";

/**
 * Models an abstract tool.
 */
class Tool {
	
	/**
	 * @param {Discord.Client} client - The client.
	 * @param {Discord.TextChannel} channel - The channel where the tool is created.
	 * @param {String} title - The name of the tool.
	 * @param {String} code - The shorthand name of the tool.
	 * @param {String} prefix - The tool title's prefix.
	 * @param {Discord.User} user - The user of the tool.
	 * @param {{}} stat - The object containing tool stats.
	 * @param {} defaultStat - The default value for stats.
	 */
	constructor(client, channel, title, code, prefix, user, stat = {}, defaultStat = { uses: 0 }) {
		if (new.target === Tool) throw new TypeError("Cannot create instance of an abstract tool.");
		this.client = client;
		this.channel = channel;
		this.title = title;
		this.code = code;
		this.prefix = prefix;
		this.user = user;
		this.stat = stat;
		this.defaultStat = defaultStat;
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
	 */
	checkUndefined() {
		if (this.stat[this.channel.guild.id] === undefined) this.stat[this.channel.guild.id] = {};
		if (this.stat[this.channel.guild.id][this.code] === undefined) this.stat[this.channel.guild.id][this.code] = {};
		if (this.user && this.stat[this.channel.guild.id][this.code][this.user.id] === undefined) this.stat[this.channel.guild.id][this.code][this.user.id] = JSON.parse(JSON.stringify(this.defaultStat));
	}

}

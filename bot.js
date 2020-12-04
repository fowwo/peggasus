const fs = require("fs");
const Discord = require("discord.js");
const client = new Discord.Client();

const token = fs.readFileSync("token.txt", "utf-8").trim();
client.login(token);

client.on('ready', () => console.log(`Logged in as ${client.user.tag}!`));

client.on('message', (msg) => {});

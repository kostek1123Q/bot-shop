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
  const contentUpper = content.toUpperCase();

  // Komenda !help / !pomoc — lista komend
  if (content.toLowerCase() === '!help' || content.toLowerCase() === '!pomoc') {
    const helpMessage = 
`📜 **Dostępne komendy / Available commands:**

**!kod / !code** — Wygeneruj nowy kod promocyjny / Generate a new promo code  
**!say [tekst]** — Bot powtórzy tekst (tylko admin) / Bot repeats the text (admin only)  
**!ping** — Sprawdź ping bota / Check the bot's ping  
**!userinfo @user** — Informacje o użytkowniku / User information  
**!remindme [minuty] [tekst]** — Ustaw przypomnienie / Set a reminder  
**!help / !pomoc** — Wyświetl tę pomoc / Show this help message`;

    return message.channel.send(helpMessage);
  }

  // Komenda !say — bot powtarza tekst, tylko admin
  if (content.toLowerCase().startsWith('!say ')) {
    if (!message.member.permissions.has('Administrator')) {
      return message.reply('🚫 Nie masz uprawnień do używania tej komendy. / You do not have permission to use this command.');
    }
    const sayMessage = content.slice(5).trim();
    if (!sayMessage) {
      return message.reply('Proszę podać tekst do powtórzenia. / Please provide text to say.');
    }
    return message.channel.send(sayMessage);
  }

  // Obsługa kodów promocyjnych
  if (activeCodes.hasOwnProperty(contentUpper) && activeCodes[contentUpper] === null) {
    const reward = rollReward();

    activeCodes[contentUpper] = {
      user: message.author.id,
      reward: reward,
      timestamp: Date.now()
    };
    saveCodes();

    const notifyChannel = await client.channels.fetch(process.env.NOTIFY_CHANNEL_ID);
    if (notifyChannel) {
      notifyChannel.send(
        `🎉 Użytkownik <@${message.author.id}> użył kodu \`${contentUpper}\` i otrzymał: **${reward}**\n` +
        `🎉 User <@${message.author.id}> used code \`${contentUpper}\` and got: **${reward}**`
      );
    }

    return message.reply(
      `✅ Gratulacje! Otrzymujesz: **${reward}**\n` +
      `✅ Congratulations! You received: **${reward}**`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);

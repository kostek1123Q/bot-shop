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
  const contentLower = content.toLowerCase();
  const contentUpper = content.toUpperCase();

  // Komenda !help / !pomoc
  if (contentLower === '!help' || contentLower === '!pomoc') {
    message.channel.send(
      `**Dostępne komendy:**\n` +
      `!kod lub !code - otrzymujesz aktualny kod promocyjny (jeśli jest)\n` +
      `!say [tekst] - bot powtórzy Twój tekst\n` +
      `!ping - sprawdź latencję bota\n` +
      `!remindme [czas w minutach] [tekst] - przypomnienie w prywatnej wiadomości\n\n` +
      `**Available commands:**\n` +
      `!kod or !code - get the current promo code (if any)\n` +
      `!say [text] - bot repeats your text\n` +
      `!ping - check bot latency\n` +
      `!remindme [minutes] [text] - reminder via DM\n`
    );
    return;
  }

  // Komenda !ping
  if (contentLower === '!ping') {
    const sent = await message.channel.send('Pinging...');
    sent.edit(`Pong! 🏓 Latencja: ${sent.createdTimestamp - message.createdTimestamp} ms`);
    return;
  }

  // Komenda !remindme [czas w minutach] [tekst]
  if (contentLower.startsWith('!remindme ')) {
    const args = content.split(' ');
    if (args.length < 3) {
      return message.reply('Użycie: !remindme [czas w minutach] [tekst]\nExample: !remindme 5 Przypomnienie o spotkaniu');
    }

    const time = parseInt(args[1], 10);
    if (isNaN(time) || time <= 0) {
      return message.reply('Podaj poprawny czas w minutach większy niż 0.');
    }

    const reminderText = args.slice(2).join(' ');
    message.reply(`Ok! Przypomnę Ci o tym za ${time} minut.`);

    setTimeout(() => {
      message.author.send(`⏰ Przypomnienie: ${reminderText}`).catch(() => {
        message.channel.send(`<@${message.author.id}>, nie mogę wysłać Ci wiadomości prywatnej. Sprawdź ustawienia prywatności.`);
      });
    }, time * 60 * 1000);

    return;
  }

  // Komenda !say
  if (contentLower.startsWith('!say ')) {
    const sayText = content.slice(5).trim();
    if (!sayText) return message.reply('Podaj tekst do powtórzenia / Please provide text to say.');
    message.channel.send(sayText);
    return;
  }

  // Obsługa kodów promocyjnych (wpisanie kodu)
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

    message.reply(
      `✅ Gratulacje! Otrzymujesz: **${reward}**\n` +
      `✅ Congratulations! You received: **${reward}**`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);

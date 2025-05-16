require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
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

async function postCode(channel) {
  const code = generateCode();
  activeCodes[code] = null;
  saveCodes();

  try {
    await channel.send(
      `🎁 **Nowy kod promocyjny:** \`${code}\`  |  🎁 **New promo code:** \`${code}\`\n` +
      `Kto pierwszy, ten lepszy! / First come, first served!`
    );
  } catch (err) {
    console.error('Błąd wysyłania kodu:', err);
  }
}

client.once('ready', async () => {
  console.log(`Zalogowano jako ${client.user.tag}`);
  loadCodes();

  try {
    const channel = await client.channels.fetch(process.env.CODES_CHANNEL_ID);
    if (!channel) {
      console.error('Nie znaleziono kanału z kodami!');
      return;
    }

    postCode(channel);
    setInterval(() => postCode(channel), CODE_INTERVAL);
  } catch (error) {
    console.error('Błąd podczas pobierania kanału z kodami:', error);
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim();
  const contentLower = content.toLowerCase();
  const contentUpper = content.toUpperCase();

  // Komenda !help / !pomoc
  if (contentLower === '!help' || contentLower === '!pomoc') {
    const helpMessage = 
`📜 **Dostępne komendy / Available commands:**

**!kod / !code** — Wygeneruj nowy kod promocyjny / Generate a new promo code  
**!say [tekst]** — Bot powtórzy tekst (tylko admin) / Bot repeats the text (admin only)  
**!help / !pomoc** — Wyświetl tę pomoc / Show this help message`;

    return message.channel.send(helpMessage);
  }

  // Komenda !kod lub !code - generuje i wysyła kod natychmiast
  if (contentLower === '!kod' || contentLower === '!code') {
    // Sprawdź uprawnienia jeśli chcesz, np. admin tylko
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('🚫 Nie masz uprawnień do generowania kodów. / You do not have permission to generate codes.');
    }

    const code = generateCode();
    activeCodes[code] = null;
    saveCodes();

    message.channel.send(
      `🎁 **Nowy kod promocyjny:** \`${code}\`  |  🎁 **New promo code:** \`${code}\`\n` +
      `Kto pierwszy, ten lepszy! / First come, first served!`
    );
    return;
  }

  // Komenda !say [tekst]
  if (contentLower.startsWith('!say ')) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('🚫 Nie masz uprawnień do używania tej komendy. / You do not have permission to use this command.');
    }
    const sayMessage = content.slice(5).trim();
    if (!sayMessage) {
      return message.reply('Proszę podać tekst do powtórzenia. / Please provide text to say.');
    }
    return message.channel.send(sayMessage);
  }

  // Obsługa wpisania kodu promocyjnego
  if (activeCodes.hasOwnProperty(contentUpper) && activeCodes[contentUpper] === null) {
    const reward = rollReward();

    activeCodes[contentUpper] = {
      user: message.author.id,
      reward: reward,
      timestamp: Date.now()
    };
    saveCodes();

    try {
      const notifyChannel = await client.channels.fetch(process.env.NOTIFY_CHANNEL_ID);
      if (notifyChannel) {
        notifyChannel.send(
          `🎉 Użytkownik <@${message.author.id}> użył kodu \`${contentUpper}\` i otrzymał: **${reward}**\n` +
          `🎉 User <@${message.author.id}> used code \`${contentUpper}\` and got: **${reward}**`
        );
      }
    } catch (err) {
      console.error('Błąd wysyłania powiadomienia:', err);
    }

    return message.reply(
      `✅ Gratulacje! Otrzymujesz: **${reward}**\n` +
      `✅ Congratulations! You received: **${reward}**`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);

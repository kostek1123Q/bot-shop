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

const PREFIX = '!';
const CODE_LENGTH = 8;
let activeCodes = {};

function loadCodes() {
  if (fs.existsSync('codes.json')) {
    activeCodes = JSON.parse(fs.readFileSync('codes.json', 'utf8'));
  }
}

function saveCodes() {
  fs.writeFileSync('codes.json', JSON.stringify(activeCodes, null, 2));
}

function rollReward() {
  const chance = Math.random() * 100;
  if (chance < 5) return '-50% zniżki 🎉 / 50% discount 🎉';
  if (chance < 15) return '-40% zniżki 🎉 / 40% discount 🎉';
  if (chance < 30) return '-30% zniżki 🎉 / 30% discount 🎉';
  if (chance < 50) return '-20% zniżki 🎉 / 20% discount 🎉';
  return 'Nic 😢 / Nothing 😢';
}

client.once('ready', () => {
  console.log(`✅ Zalogowano jako ${client.user.tag}`);
  loadCodes();
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();
  const content = message.content.trim().toUpperCase();

  // !code
  if (command === 'code') {
    const userCode = args[0]?.toUpperCase();
    if (!userCode || !activeCodes.hasOwnProperty(userCode)) {
      return message.reply('❌ Nieprawidłowy kod / Invalid code.');
    }

    if (activeCodes[userCode] !== null) {
      return message.reply('❌ Ten kod został już użyty / This code has already been used.');
    }

    const reward = rollReward();
    activeCodes[userCode] = {
      user: message.author.id,
      reward: reward,
      timestamp: Date.now()
    };
    saveCodes();

    const notifyChannel = await client.channels.fetch(process.env.NOTIFY_CHANNEL_ID);
    if (notifyChannel) {
      notifyChannel.send(
        `🎉 <@${message.author.id}> użył kodu \`${userCode}\` i otrzymał: **${reward}**`
      );
    }

    return message.reply(
      `✅ Gratulacje! Otrzymujesz: **${reward}**\n✅ Congratulations! You received: **${reward}**`
    );
  }

  // !say
  if (command === 'say') {
    const msg = args.join(' ');
    if (!msg) return message.reply('❌ Podaj wiadomość / Please provide a message.');
    return message.channel.send(msg);
  }

  // !ping
  if (command === 'ping') {
    return message.reply('🏓 Pong!');
  }

  // !remindme
  if (command === 'remindme') {
    const time = parseInt(args[0]) * 1000;
    const reminder = args.slice(1).join(' ');
    if (isNaN(time) || !reminder) {
      return message.reply('❌ Użycie: `!remindme <sekundy> <wiadomość>`');
    }
    message.reply(`⏰ Przypomnienie ustawione na ${args[0]} sekund.`);
    setTimeout(() => {
      message.author.send(`🔔 Przypomnienie: ${reminder}`);
    }, time);
  }

  // !help
  if (command === 'help' || command === 'pomoc') {
    return message.reply(
      `📜 **Dostępne komendy / Available commands**:\n` +
      `• \`!code <kod>\` – Użyj kodu / Use a code\n` +
      `• \`!say <wiadomość>\` – Bot powtórzy wiadomość / Bot repeats message\n` +
      `• \`!ping\` – Sprawdź opóźnienie / Check latency\n` +
      `• \`!remindme <sekundy> <wiadomość>\` – Przypomnienie / Reminder\n` +
      `• \`!help\` – Lista komend / Command list\n` +
      `• \`!adminhelp\` – Komendy administratora / Admin commands`
    );
  }

  // !adminhelp
  if (command === 'adminhelp') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Ta komenda jest tylko dla administratorów. / This command is admin-only.');
    }

    return message.reply(
      `🛠️ **Komendy administratora / Admin Commands**:\n` +
      `• \`!addcode <KOD>\` – Dodaj kod ręcznie / Add code manually\n` +
      `• \`!resetcodes\` – Usuń wszystkie kody / Delete all codes\n` +
      `• \`!codesused\` – Liczba użytych kodów / Used code count`
    );
  }

  // !addcode
  if (command === 'addcode') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    const newCode = args[0]?.toUpperCase();
    if (!newCode) return message.reply('❌ Podaj kod do dodania / Provide a code to add.');
    activeCodes[newCode] = null;
    saveCodes();
    return message.reply(`✅ Kod \`${newCode}\` został dodany.`);
  }

  // !resetcodes
  if (command === 'resetcodes') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;
    activeCodes = {};
    saveCodes();
    return message.reply('✅ Wszystkie kody zostały zresetowane.');
  }

  // !codesused
  if (command === 'codesused') {
    const used = Object.values(activeCodes).filter(v => v !== null).length;
    return message.reply(`📊 Liczba użytych kodów: ${used}`);
  }
});

client.login(process.env.DISCORD_TOKEN);

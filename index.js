if (command === 'adminhelp') {
  if (!message.member.roles.cache.has(ADMIN_ROLE_ID)) {
    return message.reply('Nie masz uprawnień do tej komendy.');
  }
  const adminHelpEmbed = new EmbedBuilder()
    .setTitle('Komendy Administracyjne')
    .setColor('Red')
    .setDescription(
      '`!say <tekst>` - powtórz tekst\n' +
        '`Przyciski ticketów` - Claim, Close (tylko admin)\n' +
        '`!adminhelp` - pokazuje tę pomoc'
    );
  message.channel.send({ embeds: [adminHelpEmbed] });
}

if (command === 'ping') {
  const sent = await message.channel.send('Pinging...');
  sent.edit(`Pong! Latency: ${sent.createdTimestamp - message.createdTimestamp}ms. API: ${Math.round(client.ws.ping)}ms`);
}

if (command === 'remindme') {
  if (args.length < 2) return message.reply('Użycie: !remindme <czas w minutach> <wiadomość>');
  const time = parseInt(args.shift());
  if (isNaN(time) || time <= 0) return message.reply('Podaj poprawny czas w minutach!');
  const reminderMsg = args.join(' ');
  message.reply(`Przypomnienie ustawione na ${time} minut!`);
  setTimeout(() => {
    message.author.send(`⏰ Przypomnienie: ${reminderMsg}`);
  }, time * 60 * 1000);
}
}
});

client.login(process.env.DISCORD_TOKEN);

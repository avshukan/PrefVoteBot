const COMMANDS = {
  ABOUT: 'about', // about - информация о боте
  CREATEDBYME: 'createdbyme', // createdbyme - опросы, созданные мной
  FIND: 'find', // find - поиск опроса
  HELP: 'help', // help - в случае проблем
  NEW: 'new', // new - создать опрос
  POPULAR: 'popular', // popular - самые популярные опросы
  RANDOM: 'random', // random - случайный опрос
  SETTINGS: 'settings', // settings - настройки
  VOTEDBYME: 'votedbyme', // votedbyme - опросы, в которых я принял участие
};

function isCommand(text) {
  return Object.values(COMMANDS).some((command) => text === `/${command}`);
}

module.exports = { COMMANDS, isCommand };

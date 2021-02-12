class Storage {
    constructor() {
      this.state = {};
    }

    getState() {
        return this.state;
    }

    setState (state) {
        this.state = state;
    }

    async onText(context) {
        console.log('this', this);
        const state = this.state;
        console.log('onText start state', state);
        const userId = context.message.from.id;
        const text = context.message.text;

        if (!state[userId])
        state[userId] = { id: userId };
        state[userId].index = 0;

        console.log('onText middle state', state);

        if (state[userId].command === 'new') {
        switch (state[userId].subCommand) {
            case 'header':
            state[userId].header = text.substr(0, 63);
            state[userId].subCommand = 'question';
            context.replyWithMarkdown('Отправьте текст вопроса', Markup
                .keyboard(['❌ Cancel'])
                .oneTime()
                .resize(),
            );
            break;
            case 'question':
            state[userId].text = text.substr(0, 255);;
            state[userId].options = [];
            state[userId].subCommand = 'option';
            context.replyWithMarkdown('Отправьте вариант ответа', Markup
                .keyboard(['❌ Cancel'])
                .oneTime()
                .resize(),
            );
            break;
            case 'option':
            state[userId].options.push(text.substr(0, 100));
            context.replyWithMarkdown('Отправьте вариант ответа', Markup
                .keyboard([['✔️ Done', '❌ Cancel']])
                .oneTime()
                .resize(),
            );
            break;
        }
        }
        if (state[userId].command === 'vote') {
        console.log('onText state options', state[userId].options);
        const optionIndex = state[userId].options.findIndex(option => option.Name === text);
        console.log('onText optionIndex', optionIndex);
        if (optionIndex === -1) {
            const text = `Простите, такого значения нет в списке вариантов\n** ${state[userId].header} **\n${state[userId].text}`;
            const buttons = state[userId].options.map(option => [option.Name]);
            const mid = await context.replyWithMarkdown(text, Markup
            .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
            .oneTime()
            .resize(),
            );
            state[userId].mid.push(mid);
        } else {
            const selectedOption = state[userId].options.splice(optionIndex, 1);
            state[userId].optionsSelected.push(...selectedOption);
            if (state[userId].options.length > 1) {
            const buttons = state[userId].options.map(option => option.Name);
            console.log('id', context.message.message_id);
            await context.deleteMessage(context.message.message_id);
            const del = await context.deleteMessage(state[userId].voteMessageId.message_id);
            console.log('del', del);
            let text = `${state[userId].header}\n${state[userId].text}\nВы уже выбрали:`;
            state[userId].optionsSelected.forEach((option, index) => {
                text += `\n${index + 1}. ${option.Name}`;
            });
            const mid = await context.replyWithMarkdown(text, Markup
                .keyboard([...buttons.map(button => [button]), ['❌ Cancel']])
                .oneTime()
                .resize(),
            );
            state[userId].voteMessageId = mid;
            state[userId].mid.push(mid);
            } else {
            const selectedOption = state[userId].options.pop();
            console.log('last option', selectedOption);
            state[userId].optionsSelected.push(selectedOption);
            console.log('state[userId].optionsSelected all', state[userId].optionsSelected);
            const saveData = state[userId].optionsSelected.map((option, index) => {
                return [option.QuestionId, option.Id, index + 1, userId];
            });
            console.log('saveData', saveData);

            const saveSql = 'INSERT INTO `prefvotebot_ranks` (`QuestionId`, `OptionId`, `Rank`, `User`) VALUES ?';
            const saveResult = await promisePool.query(saveSql, [saveData]);
            console.log('saveResult', saveResult);

            const statusSql = 'INSERT INTO `prefvotebot_statuses` (`QuestionId`, `User`, `Status`) VALUES (?, ?, ?)';
            const statusResult = await promisePool.query(statusSql, [state[userId].questionId, state[userId].id, 'ANSWERED']);
            console.log('statusResult', statusResult);

            let text = `Вы завершили опрос * ${state[userId].header} * \nВаш выбор:`;
            state[userId].optionsSelected.forEach((option, index) => {
                text += `\n${index + 1}. ${option.Name}`;
            });
            context.replyWithMarkdown(text, Markup
                .keyboard([['👁 Results']])
                .oneTime()
                .resize(),
            );

            }
        }

        }
        console.log('onText state', state);
        console.log('onText state mid', state[userId].mid);
        console.log('onText state optionsSelected', state[userId].optionsSelected);
    }
}

module.exports = Storage;
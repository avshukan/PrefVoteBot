'use strict';
function createDBStorage(pool) {
  let _pool = pool;

  async function getQuestionStatus(questionId, userId) {
    const sql = 'SELECT * FROM `prefvotebot_statuses` WHERE `QuestionId` = ? AND `User` = ?';
    const data = [questionId, userId];
    const result = await _pool.execute(sql, data);
    const [rows] = result;
    if (rows.length === 0)
      return null;
    return rows[0].Status;
  };

  async function getOptions(questionId) {
    const sql = 'SELECT * FROM `prefvotebot_options` WHERE `QuestionId` = ?';
    const data = [questionId];
    const [options] = await _pool.execute(sql, data);
    return options;
  }

  async function getQuestionWithOptions(questionId) {
    const questionSQL = 'SELECT * FROM `prefvotebot_questions` WHERE `Id` = ?';
    const optioinsSQL = 'SELECT * FROM `prefvotebot_options` WHERE `QuestionId` = ?';
    const data = [questionId];
    const [questionRow] = await _pool.execute(questionSQL, data);
    const [optionsRows] = await _pool.execute(optioinsSQL, data);
    return {
      header: questionRow[0].Header,
      text: questionRow[0].Text,
      options: optionsRows,
    };
  }

  async function getRanks(questionId) {
    const sql = `SELECT
        r1.OptionId Option1,
        r2.OptionId Option2,
        SUM(CASE WHEN r1.Rank < r2.Rank THEN 1 ELSE 0 END) K
      FROM (
        SELECT *
        FROM prefvotebot_ranks
        WHERE QuestionId = ?
      ) r1
      INNER JOIN (
        SELECT *
        FROM prefvotebot_ranks
        WHERE QuestionId = ?
      ) r2
      ON r1.User = r2.User
      GROUP BY
        r1.OptionId,
        r2.OptionId`;
    const data = [questionId, questionId];
    const [ranks] = await _pool.query(sql, data);
    return ranks;
  }

  async function saveRanks({ userId, options}) {
    const sql = 'INSERT INTO `prefvotebot_ranks` (`QuestionId`, `OptionId`, `Rank`, `User`) VALUES ?';
    const data = [options.map((option, index) => [option.QuestionId, option.Id, index + 1, userId])];
    console.log('sql', sql);
    console.log('data', data);
    const result = await _pool.query(sql, data);
    return result;
  }

  async function saveStatus({ userId, questionId, status }) {
    const sql = 'INSERT INTO `prefvotebot_statuses` (`QuestionId`, `User`, `Status`) VALUES (?, ?, ?)';
    const data = [questionId, userId, status];
    const result = await _pool.query(sql, data);
    return result;
  }

  async function saveQuestionWithOptions({userId, header, text, options}) {
    const questionSQL = 'INSERT INTO `prefvotebot_questions` (`Header`, `Text`, `Owner`) VALUES (?, ?, ?)';
    const questionData = [header, text, userId];
    const questionResult = await _pool.query(questionSQL, questionData);
    const questionId = questionResult[0].insertId;
    const optionsSQL = 'INSERT INTO `prefvotebot_options` (`QuestionId`, `Name`) VALUES ?';
    const optionsData = [options.map(element => [questionId, element])];
    await _pool.query(optionsSQL, optionsData);
    return questionId;
  }

  return {
    getQuestionStatus,
    getQuestionWithOptions,
    getOptions,
    getRanks,
    saveQuestionWithOptions,
    saveRanks,
    saveStatus,
  };
}

module.exports = createDBStorage;

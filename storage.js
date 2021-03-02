require('dotenv').config();

const {
  MYSQL_HOSTNAME,
  MYSQL_DATABASE,
  MYSQL_USERNAME,
  MYSQL_PASSWORD,
  MYSQL_POOLSIZE,
} = process.env;

const mysql = require('mysql2');

const pool = mysql.createPool({
  connectionLimit: MYSQL_POOLSIZE,
  host: MYSQL_HOSTNAME,
  user: MYSQL_USERNAME,
  password: MYSQL_PASSWORD,
  database: MYSQL_DATABASE,
});

const promisePool = pool.promise();

function createDBStorage() {
  const storagePool = promisePool;

  async function getQuestion(questionId) {
    try {
      const sql = 'SELECT * FROM `prefvotebot_questions` WHERE `Id` = ?';
      const data = [questionId];
      const [question] = await storagePool.execute(sql, data);
      return {
        header: question[0].Header,
        text: question[0].Text,
      };
    } catch (e) {
      return e;
    }
  }

  async function getQuestionCreatedByUser(questionId) {
    try {
      const sql = 'SELECT * FROM `prefvotebot_questions` WHERE `Id` = ?';
      const data = [questionId];
      const [question] = await storagePool.execute(sql, data);
      return {
        header: question[0].Header,
        text: question[0].Text,
      };
    } catch (e) {
      return e;
    }
  }

  async function getQuestionStatus(questionId, userId) {
    try {
      const sql = 'SELECT * FROM `prefvotebot_statuses` WHERE `QuestionId` = ? AND `User` = ?';
      const data = [questionId, userId];
      const result = await storagePool.execute(sql, data);
      const [rows] = result;
      if (rows.length === 0) { return null; }
      return rows[0].Status;
    } catch (e) {
      return e;
    }
  }

  async function getOptions(questionId) {
    try {
      const sql = 'SELECT * FROM `prefvotebot_options` WHERE `QuestionId` = ?';
      const data = [questionId];
      const [options] = await storagePool.execute(sql, data);
      return options;
    } catch (e) {
      return e;
    }
  }

  async function getQuestionWithOptions(questionId) {
    try {
      const questionSQL = 'SELECT * FROM `prefvotebot_questions` WHERE `Id` = ?';
      const optioinsSQL = 'SELECT * FROM `prefvotebot_options` WHERE `QuestionId` = ?';
      const data = [questionId];
      const [questionRow] = await storagePool.execute(questionSQL, data);
      const [optionsRows] = await storagePool.execute(optioinsSQL, data);
      return {
        header: questionRow[0].Header,
        text: questionRow[0].Text,
        options: optionsRows,
      };
    } catch (e) {
      return e;
    }
  }

  async function getVotersCount(questionId) {
    try {
      const sql = 'SELECT COUNT(DISTINCT User) AS VotersCount FROM `prefvotebot_ranks` WHERE `QuestionId` = ?';
      const data = [questionId];
      const [result] = await storagePool.execute(sql, data);
      return { votersCount: result[0].VotersCount };
    } catch (e) {
      return e;
    }
  }

  async function getRanks(questionId) {
    try {
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
      const [ranks] = await storagePool.query(sql, data);
      return ranks;
    } catch (e) {
      return e;
    }
  }

  async function saveRanks({ userId, options }) {
    try {
      const sql = 'INSERT INTO `prefvotebot_ranks` (`QuestionId`, `OptionId`, `Rank`, `User`) VALUES ?';
      const data = [options.map((item, index) => [item.QuestionId, item.Id, index + 1, userId])];
      const result = await storagePool.query(sql, data);
      return result;
    } catch (e) {
      return e;
    }
  }

  async function saveStatus({ userId, questionId, status }) {
    try {
      const sql = 'INSERT INTO `prefvotebot_statuses` (`QuestionId`, `User`, `Status`) VALUES (?, ?, ?)';
      const data = [questionId, userId, status];
      const result = await storagePool.query(sql, data);
      return result;
    } catch (e) {
      return e;
    }
  }

  async function saveQuestionWithOptions({
    userId, header, text, options,
  }) {
    try {
      const questionSQL = 'INSERT INTO `prefvotebot_questions` (`Header`, `Text`, `Owner`) VALUES (?, ?, ?)';
      const questionData = [header, text, userId];
      const questionResult = await storagePool.query(questionSQL, questionData);
      const questionId = questionResult[0].insertId;
      const optionsSQL = 'INSERT INTO `prefvotebot_options` (`QuestionId`, `Name`) VALUES ?';
      const optionsData = [options.map((element) => [questionId, element])];
      await storagePool.query(optionsSQL, optionsData);
      return questionId;
    } catch (e) {
      return e;
    }
  }

  return {
    getQuestion,
    getQuestionStatus,
    getQuestionWithOptions,
    getOptions,
    getVotersCount,
    getRanks,
    saveQuestionWithOptions,
    saveRanks,
    saveStatus,
  };
}

module.exports = createDBStorage;

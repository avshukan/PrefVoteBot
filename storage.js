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
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getAnswersByUser(questionId, userId) {
    try {
      const sql = `
        SELECT pq.Header, pq.Text, pr.Rank, po.Name
        FROM prefvotebot_ranks pr
        INNER JOIN prefvotebot_questions pq
        ON pr.QuestionId = pq.Id
        INNER JOIN prefvotebot_options po
        ON pr.QuestionId = po.QuestionId AND pr.OptionId = po.Id
        WHERE pr.QuestionId = ? AND pr.User = ?
      `;
      const data = [questionId, userId];
      const [answers] = await storagePool.execute(sql, data);
      return answers;
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getQuestionsCreatedByUser(userId) {
    try {
      const sql = `
        SELECT Id, Header, Text, Voters
        FROM prefvotebot_questions pq
        INNER JOIN (
          SELECT QuestionId, COUNT(DISTINCT User) AS Voters
          FROM prefvotebot_statuses
          WHERE Status = "ANSWERED"
          GROUP BY QuestionId
        ) pv
        ON (pq.Id = pv.QuestionId)
        WHERE Owner = ?
        ORDER BY CreatedDate DESC`;
      const data = [userId];
      const [questions] = await storagePool.execute(sql, data);
      return questions.map(({
        Id, Header, Text, Voters,
      }) => ({
        id: Id, header: Header, text: Text, voters: Voters,
      }));
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getQuestionsVotedByUser(userId) {
    try {
      const sql = `
        SELECT pq.Id, Header, Text, Voters
        FROM prefvotebot_questions pq
        INNER JOIN prefvotebot_statuses ps
        ON (pq.Id = ps.QuestionId)
        INNER JOIN (
          SELECT QuestionId, COUNT(DISTINCT User) AS Voters
          FROM prefvotebot_statuses
          WHERE Status = "ANSWERED"
          GROUP BY QuestionId
        ) pv
        ON (pq.Id = pv.QuestionId)
        WHERE ps.User = ?
        ORDER BY ps.StatusDate DESC`;
      const data = [userId];
      const [questions] = await storagePool.execute(sql, data);
      return questions.map(({
        Id, Header, Text, Voters,
      }) => ({
        id: Id, header: Header, text: Text, voters: Voters,
      }));
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getQuestionsWithText(textArray = []) {
    try {
      const headerWhere = textArray.map((item) => `HEADER LIKE '%${item}%'`);
      const textWhere = textArray.map((item) => `TEXT LIKE '%${item}%'`);
      const sql = `
        SELECT pq.Id, Header, Text, Voters
        FROM prefvotebot_questions pq
        LEFT OUTER JOIN (
          SELECT QuestionId, COUNT(DISTINCT User) AS Voters
          FROM prefvotebot_statuses
          WHERE Status = "ANSWERED"
          GROUP BY QuestionId
        ) pv
        ON (pq.Id = pv.QuestionId)
        WHERE (${headerWhere.join(' AND ')}) OR (${textWhere.join(' AND ')})
        ORDER BY CreatedDate DESC`;
      const [questions] = await storagePool.execute(sql);
      return questions.map(({
        Id, Header, Text, Voters,
      }) => ({
        id: Id, header: Header, text: Text, voters: Voters,
      }));
    } catch (error) {
      console.error(error);
      return { error };
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
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getQuestionsPopular() {
    try {
      const sql = `
        SELECT pq.Id, Header, Text, Voters
        FROM prefvotebot_questions pq
        INNER JOIN (
          SELECT QuestionId, COUNT(DISTINCT User) AS Voters
          FROM prefvotebot_statuses
          WHERE Status = "ANSWERED"
          GROUP BY QuestionId
        ) pv
        ON (pq.Id = pv.QuestionId)
        ORDER BY
          Voters DESC,
          CreatedDate DESC
        LIMIT 10`;
      const [questions] = await storagePool.execute(sql);
      return questions.map(({
        Id, Header, Text, Voters,
      }) => ({
        id: Id, header: Header, text: Text, voters: Voters,
      }));
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getQuestionsRandom() {
    try {
      const sqlCount = `
        SELECT COUNT(*) K
        FROM prefvotebot_questions pq`;
      const [resultCount] = await storagePool.execute(sqlCount);
      const count = resultCount[0].K;
      const randomId = Math.floor(count * Math.random());
      const sql = `SELECT Id
        FROM prefvotebot_questions pq
        ORDER BY Id ASC
        LIMIT ?, 1`;
      const data = [randomId];
      const [questions] = await storagePool.execute(sql, data);
      const questionId = questions[0].Id;
      return questionId;
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getOptions(questionId) {
    try {
      const sql = 'SELECT * FROM `prefvotebot_options` WHERE `QuestionId` = ?';
      const data = [questionId];
      const [options] = await storagePool.execute(sql, data);
      return options;
    } catch (error) {
      console.error(error);
      return { error };
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
        options: optionsRows.map(
          ({ Id, QuestionId, Name }) => ({ id: Id, questionId: QuestionId, name: Name }),
        ),
      };
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function getVotersCount(questionId) {
    try {
      const sql = 'SELECT COUNT(DISTINCT User) AS VotersCount FROM `prefvotebot_ranks` WHERE `QuestionId` = ?';
      const data = [questionId];
      const [result] = await storagePool.execute(sql, data);
      return { votersCount: result[0].VotersCount };
    } catch (error) {
      console.error(error);
      return { error };
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
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function saveRanks({
    userId, optionsSelected, options, userFirstName, userLastName, userName,
  }) {
    try {
      const sql = `INSERT INTO prefvotebot_ranks
        (QuestionId, OptionId, Rank, User, UserFirstName, UserLastName, UserName)
        VALUES ?`;
      const unselectedIndex = optionsSelected.length + 1;
      const data = [[
        ...optionsSelected.map((item, index) => [
          item.questionId, item.id, index + 1, userId, userFirstName, userLastName, userName,
        ]),
        ...options.map((item) => [
          item.questionId, item.id, unselectedIndex, userId, userFirstName, userLastName, userName,
        ]),
      ]];
      const result = await storagePool.query(sql, data);
      return result;
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function saveStatus({
    userId, questionId, status, userFirstName, userLastName, userName,
  }) {
    try {
      const sql = `INSERT INTO prefvotebot_statuses
        (QuestionId, User, Status, UserFirstName, UserLastName, UserName)
        VALUES (?, ?, ?, ?, ?, ?)`;
      const data = [questionId, userId, status, userFirstName, userLastName, userName];
      const result = await storagePool.query(sql, data);
      return result;
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  async function saveQuestionWithOptions({
    userId, header, text, options, userFirstName, userLastName, userName,
  }) {
    try {
      const questionSQL = `INSERT INTO prefvotebot_questions
        (Header, Text, Owner, UserFirstName, UserLastName, UserName)
        VALUES (?, ?, ?, ?, ?, ?)`;
      const questionData = [header, text, userId, userFirstName, userLastName, userName];
      const questionResult = await storagePool.query(questionSQL, questionData);
      const questionId = questionResult[0].insertId;
      const optionsSQL = 'INSERT INTO prefvotebot_options (QuestionId, Name) VALUES ?';
      const optionsData = [options.map((element) => [questionId, element])];
      await storagePool.query(optionsSQL, optionsData);
      return questionId;
    } catch (error) {
      console.error(error);
      return { error };
    }
  }

  return {
    getQuestion,
    getAnswersByUser,
    getQuestionsCreatedByUser,
    getQuestionsVotedByUser,
    getQuestionsWithText,
    getQuestionStatus,
    getQuestionWithOptions,
    getQuestionsPopular,
    getQuestionsRandom,
    getOptions,
    getVotersCount,
    getRanks,
    saveQuestionWithOptions,
    saveRanks,
    saveStatus,
  };
}

module.exports = createDBStorage;

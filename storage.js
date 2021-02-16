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

    return {
        getQuestionStatus
    };
  }

  module.exports = createDBStorage;

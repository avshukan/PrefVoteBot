# Пересчёт матрицы при исключении какого-либо варианта

SELECT pr.newRank Rank, Name, COUNT(*)
FROM (
    SELECT pr1.User, pr1.OptionId, pr1.Rank, COUNT(*) newRank
    FROM prefvotebot_ranks pr1
    INNER JOIN prefvotebot_ranks pr2
    ON (pr1.QuestionId = 5 AND pr1.QuestionId = pr2.QuestionId AND pr1.User = pr2.User AND pr1.Rank >= pr2.Rank AND pr1.OptionId <> 4 AND pr2.OptionId <> 4)
    GROUP BY pr1.User, pr1.OptionId, pr1.Rank
) pr
INNER JOIN prefvotebot_options po
ON (pr.OptionId = po.Id)
GROUP BY newRank, Name
ORDER BY newRank, COUNT(*) DESC, Name
function method(options, ranks) {
  const optionsList = options;
  const rows = ranks;
  const d = [];
  const p = [];
  optionsList.forEach((option1) => {
    d[option1] = [];
    optionsList.forEach((option2) => {
      d[option1][option2] = 0;
    });
  });
  optionsList.forEach((option1) => {
    p[option1] = [];
    optionsList.forEach((option2) => {
      p[option1][option2] = 0;
    });
  });

  rows.forEach((row) => {
    d[row.Option1][row.Option2] = parseInt(row.K, 10);
  });

  for (let i = 0; i < optionsList.length; i += 1) {
    for (let j = 0; j < optionsList.length; j += 1) {
      if (i !== j) {
        if (d[optionsList[i]][optionsList[j]] > d[optionsList[j]][optionsList[i]]) {
          p[optionsList[i]][optionsList[j]] = d[optionsList[i]][optionsList[j]];
        } else {
          p[optionsList[i]][optionsList[j]] = 0;
        }
      }
    }
  }

  for (let i = 0; i < optionsList.length; i += 1) {
    for (let j = 0; j < optionsList.length; j += 1) {
      if (i !== j) {
        for (let k = 0; k < optionsList.length; k += 1) {
          if (i !== k && j !== k) {
            p[optionsList[j]][optionsList[k]] = Math.max(
              p[optionsList[j]][optionsList[k]],
              Math.min(
                p[optionsList[j]][optionsList[i]],
                p[optionsList[i]][optionsList[k]],
              ),
            );
          }
        }
      }
    }
  }

  const optionsMarks = [];
  for (let i = 0; i < optionsList.length; i += 1) {
    optionsMarks[optionsList[i]] = 0;
    for (let j = 0; j < optionsList.length; j += 1) {
      if (p[optionsList[i]][optionsList[j]] > p[optionsList[j]][optionsList[i]]) {
        optionsMarks[optionsList[i]] += 2;
      } else if (p[optionsList[i]][optionsList[j]] > p[optionsList[j]][optionsList[i]]) {
        optionsMarks[optionsList[i]] += 1;
      }
    }
  }

  const optionsRating = optionsList.map((option) => {
    const result = {
      id: option,
      mark: optionsMarks[option],
      place: optionsMarks.filter((item) => (item > optionsMarks[option])).length,
      count: optionsMarks.filter((item) => (item === optionsMarks[option])).length,
    };
    return result;
  });

  return optionsRating;
}

module.exports = { method };

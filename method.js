'use strict';
function method(options, ranks) {

  const optionsList = options;
  const rows = ranks;
  const d = [];
  const p = [];
  optionsList.forEach(option1 => {
    d[option1] = [];
    optionsList.forEach(option2 => {
      d[option1][option2] = 0;
    });
  });
  optionsList.forEach(option1 => {
    p[option1] = [];
    optionsList.forEach(option2 => {
      p[option1][option2] = 0;
    });
  });

  console.log('d', d);
  rows.forEach(row => {
    d[row.Option1][row.Option2] = parseInt(row.K, 10);
  });
  console.log('d', d);

  console.log('p start', p);

  for (let i = 0; i < optionsList.length; i++) {
    for (let j = 0; j < optionsList.length; j++) {
      if (i !== j) {
        if (d[optionsList[i]][optionsList[j]] > d[optionsList[j]][optionsList[i]]) {
          p[optionsList[i]][optionsList[j]] = d[optionsList[i]][optionsList[j]];
        } else {
          p[optionsList[i]][optionsList[j]] = 0;
        }
      }
    }
  }

  console.log('p continue', p);

  for (let i = 0; i < optionsList.length; i++) {
    for (let j = 0; j < optionsList.length; j++) {
      if (i !== j) {
        for (let k = 0; k < optionsList.length; k++) {
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

  console.log('p end', p);

  const optionsMarks = [];
  for (let i = 0; i < optionsList.length; i++) {
    optionsMarks[optionsList[i]] = 0;
    for (let j = 0; j < optionsList.length; j++) {
      if (p[optionsList[i]][optionsList[j]] > p[optionsList[j]][optionsList[i]]) {
        optionsMarks[optionsList[i]] += 2;
      } else if (p[optionsList[i]][optionsList[j]] > p[optionsList[j]][optionsList[i]]) {
        optionsMarks[optionsList[i]] += 1;
      }
    }
  }
  console.log('optionsMarks', optionsMarks);

  const optionsRating = optionsList.map(option => {
    const result = {
      id: option,
      mark: optionsMarks[option],
      place: optionsMarks.filter(item => (item > optionsMarks[option])).length,
      count: optionsMarks.filter(item => (item === optionsMarks[option])).length,
    };
    return result;
  });

  return optionsRating;
}

module.exports = { method };

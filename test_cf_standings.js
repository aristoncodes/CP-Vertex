const id = 2226;
fetch(`https://codeforces.com/api/contest.standings?contestId=${id}&from=1&count=1`)
  .then(r => r.json())
  .then(data => {
    console.log(data);
  })
  .catch(console.error);

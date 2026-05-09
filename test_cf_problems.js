fetch(`https://codeforces.com/api/problemset.problems`)
  .then(r => r.json())
  .then(data => {
    const p2226 = data.result.problems.filter(p => p.contestId === 2226);
    const p2227 = data.result.problems.filter(p => p.contestId === 2227);
    console.log("2226:", p2226.length);
    console.log("2227:", p2227.length);
  })
  .catch(console.error);

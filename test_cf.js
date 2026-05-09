const handle = "joyboy24";
fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=50`)
  .then(r => r.json())
  .then(data => {
    const subs = data.result;
    const groups = {};
    for (const sub of subs) {
      if (!sub.contestId) continue;
      if (!groups[sub.contestId]) groups[sub.contestId] = [];
      groups[sub.contestId].push(sub);
    }
    for (const cid in groups) {
      const isRated = groups[cid].some(s => s.author.participantType === "CONTESTANT");
      const date = new Date(Math.max(...groups[cid].map(s => s.creationTimeSeconds)) * 1000);
      console.log(`Contest ${cid}: Rated? ${isRated}, Date: ${date.toISOString()}`);
    }
  });

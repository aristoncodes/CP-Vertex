async function test() {
  const listRes = await fetch("https://codeforces.com/api/contest.list?gym=false");
  const listData = await listRes.json();
  const finished = listData.result.filter(c => c.phase === "FINISHED").slice(0, 50);
  console.log(finished.map(c => c.id).join(", "));
}
test();

const handle = "joyboy24";
async function test() {
  try {
    const listRes = await fetch("https://codeforces.com/api/contest.list?gym=false");
    const listData = await listRes.json();
    console.log("List status:", listData.status, "List size:", listData.result.length);

    const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${handle}`);
    const ratingData = await ratingRes.json();
    console.log("Rating status:", ratingData.status, "Rating size:", ratingData.result.length);

    const participatedSet = new Set();
    if (ratingData.status === "OK") {
      ratingData.result.forEach(r => participatedSet.add(r.contestId));
    }

    const available = listData.result
      .filter(c => c.phase === "FINISHED")
      .filter(c => !participatedSet.has(c.id))
      .slice(0, 50);
      
    console.log("Available:", available.length);
  } catch (e) {
    console.error(e);
  }
}
test();

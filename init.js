import Pool from "./Model/Pool";

const pool = new Pool({
  balance: 1000000,
});

pool.save().then((pool) => {
  console.log("created pool", pool);
});

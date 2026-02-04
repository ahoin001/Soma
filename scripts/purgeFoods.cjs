const dotenv = require("dotenv");
const { Pool } = require("pg");

dotenv.config({ path: ".env.local" });
dotenv.config();

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/purgeFoods.cjs <email>");
  process.exit(1);
}

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local.");
  }

  const pool = new Pool({ connectionString });
  try {
    const userRes = await pool.query(
      "select id, email from users where lower(email)=lower($1)",
      [email],
    );
    const user = userRes.rows[0];
    if (!user) {
      throw new Error(`No user found for email ${email}`);
    }

    const deleteRes = await pool.query(
      "delete from foods where created_by_user_id is distinct from $1",
      [user.id],
    );

    console.log(`Deleted foods: ${deleteRes.rowCount}`);
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});

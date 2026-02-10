import app from "./app.js";

const port = Number(process.env.PORT ?? 8787);

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});

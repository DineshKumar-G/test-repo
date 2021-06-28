const express = require('express');
const route = require('./route');
const port = 8080;
const app = express();

app.use(route);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

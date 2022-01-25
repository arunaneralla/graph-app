const dotenv = require('dotenv');
dotenv.config();
const debug = require('debug')('graph-app:server');
const express = require("express");
const app = express();

const port = process.env.PORT || 4004;

app.get("/health", async (req, res) => {
  debug("Health check");
  res.send(`<h4>App is healthy!</h4>`);
});

const Graph = require("./graph");
const Auth = require("./auth");
const auth = new Auth();
app.use(auth.getMiddleware());
const graph = new Graph(auth);

app.get("/", async (req, res) => {
  res.send(`<h1>SAP Graph Client App</h1><h4><a href="/services">Services</a></h4><h4><a href="/sap.graph">sap.graph</a></h4><h4><a href="/quotes">Sales Quotes</a></h4>`);
});

app.get("/services", async (req, res) => {
  const response = await graph.get(req, ``, "");
  res.send(`<pre><code>${JSON.stringify(response, null, 2)}</code></pre>`);
});

app.get("/sap*", async (req, res) => {
  const path = req.url.substring(1);
  const response = await graph.get(req, `${path}`, "");
  res.send(`<pre><code>${JSON.stringify(response, null, 2)}</code></pre>`);
});

app.get("/quotes", async (req, res) => {
  const quotes = await graph.get(req, "sap.graph/SalesQuote", "$top=20");
  const qlist = quotes.value.map(q => `<p> <a href="/quote/${q.id}">${q.pricingDate} </a>
  (${q.netAmount} ${q.netAmountCurrency}) </p>`).join("");
  res.send(`<h1>Sales Quotes</h1> ${qlist}`);
});

app.get("/quote/:id", async (req, res) => {
  const id = req.params.id;
  const singleQuote = await graph.get(req, `sap.graph/SalesQuote/${id}`, "$expand=items&$select=items");
  const allItemLinks = singleQuote.items.map(item => `<p><a href="/quote/${id}/item/${item.itemId}">Product details for item ${item.itemId}: ${item.product}</a></p>`).join("");
  res.send(`<h1>Sales Quote - Detail</h1><h4><code>id: ${id}</code></h4>${allItemLinks}`);
});

app.get("/quote/:id/item/:itemId", async (req, res) => {
  const id = req.params.id;
  const itemId = req.params.itemId;
  const product = await graph.get(req, `sap.graph/SalesQuote/${id}/items/${itemId}/_product`, "$expand=distributionChains");
  res.send(`<h1>Product Detail</h1><h4><code>Sales Quote ${id} - item ${itemId}</code></h4><pre><code>${JSON.stringify(product, null, 2)}</code></pre>`);
});

app.listen(port, () => {
  debug("Server running at http://localhost:" + port + "/");
});
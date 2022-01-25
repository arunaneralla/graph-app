const fetch = require("node-fetch");
const debug = require('debug')('graph-app:graph');

const graphURL = process.env.graphURL;
const graphId = process.env.graphId;

class Graph {
  constructor(auth) {
    this.auth = auth;
    this.graphURL = graphURL;
    this.graphId = graphId;
  }

  async get(req, entity, params) {
    const token = this.auth.getToken(req);
    const url = `${this.graphURL}/${this.graphId}/${entity}${params ? `?${params}` : ""}`;
    const options = {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/json"
      }
    };
    const response = await fetch(url, options);
    debug("GET", url, response.status, response.statusText);
    return await response.json();
  }
}

module.exports = Graph;